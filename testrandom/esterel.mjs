/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/esterel.mjs        */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Fri Oct 24 16:29:15 2025                          */
/*    Last change :  Fri Nov 21 19:30:41 2025 (serrano)                */
/*    Copyright   :  2025 Manuel Serrano                               */
/*    -------------------------------------------------------------    */
/*    Testing HipHop programs with racket/esterel                      */
/*=====================================================================*/

/*---------------------------------------------------------------------*/
/*    The module                                                       */
/*---------------------------------------------------------------------*/
export { ReactiveMachine };
import { writeFileSync, existsSync, renameSync, unlinkSync } from "node:fs";
import { parseExpr } from "./expr.mjs";
import { spawnSync } from "child_process";

/*---------------------------------------------------------------------*/
/*    require                                                          */
/*---------------------------------------------------------------------*/
import { createRequire } from "module";
const require = createRequire(import.meta.url);

/*---------------------------------------------------------------------*/
/*    unary ...                                                        */
/*---------------------------------------------------------------------*/
const unary = { "!": "not" };
const binary = { "||": "or", "&&" : "and" };

/*---------------------------------------------------------------------*/
/*    margins                                                          */
/*---------------------------------------------------------------------*/
let margins = [""];

function margin(n) {
   if (n >= margins.length) {
      margins[n] = " ".repeat(n);
   }

   return margins[n];
}
   
/*---------------------------------------------------------------------*/
/*    json2esterel ...                                                 */
/*---------------------------------------------------------------------*/
function json2esterel(o, m) {

   function expr2esterel(expr) {

      function toEsterel(obj) {
	 switch (obj.kind) {
	    case "constant":
	       return obj.value;
	    case "sig":
	       if (obj.prop === "now") {
		  return obj.value;
	       } else {
		  return `pre(${obj.value})`;
	       }
	    case "unary":
	       return `${unary[obj.op]} ${toEsterel(obj.expr)}`;
	    case "binary": 
	       return `(${toEsterel(obj.lhs)} ${binary[obj.op]} ${toEsterel(obj.rhs)})`;
	    default: throw SyntaxError("Unsupported obj: " + obj.kind);
	 }
      }

      return toEsterel(parseExpr(expr));
   }
      
   function childrenOf(o, m) {
      if (o.children.length === 1) {
	 return json2esterel(o.children[0], m);
      } else {
	 return o.children.map(c => json2esterel(c, m)).join("");
      }
   }

   if (typeof m !== "number") {
      console.error("PAS BON", o.node, m, typeof m);
   }

   switch (o.node) {
      case "module":
	 return "module M :\n\n"
	    + o.signals.map(s => `inputoutput ${s} := 0 : combine integer with +;\n`).join("")
	    + childrenOf(o, m)
	    + "nothing;\n"
	    + "\nend module\n";
      case "loop":
	 return `${margin(m)}loop\n`
	    + childrenOf(o, m + 3)
	    + `${margin(m)}end loop\n`
      case "if":
	 return `${margin(m)}if ${expr2esterel(o.func)} then\n`
	    + json2esterel(o.children[0], m + 3)
	    + `${margin(m)}else\n`
	    + json2esterel(o.children[1], m + 3)
	    + `${margin(m)}end if\n`;
      case "local":
	 return `${margin(m)}signal `
	    + o.signals.map(s => `${s} := 0 : combine integer with +`).join(", ") + " in\n"
	    + childrenOf(o, m + 3)
	    + `${margin(m)}end signal\n`
      case "nothing":
	 return `${margin(m)}nothing;\n`;
      case "pause":
	 return `${margin(m)}pause;\n`;
      case "seq":
	 return childrenOf(o, m);
      case "trap":
	 return `${margin(m)}trap ${o.trapName} in\n`
	    + childrenOf(o, m + 3) + "\n"
	    + `${margin(m)}end trap\n`;
      case "exit":
	 return `${margin(m)}exit ${o.trapName};\n`
      case "halt":
	 return `${margin(m)}halt\n`;
      case "par":
	 return `${o.children.map(c => json2esterel(c, m)).join(`${margin(m + 3)}||\n`)}`;
      case "atom":
	 return `${margin(m)}nothing; %% call printf("%d", ${expr2esterel(o.func)});\n`;
      case "emit":
	 return `${margin(m)}emit ${o.signame}(${o.value});\n`;
      case "abort":
	 return `${margin(m)}abort\n`
	    + o.children.map(c => json2esterel(c, m + 3)).join("\n")
	    + `${margin(m)}when ${expr2esterel(o.func)}\n`
      case "every":
	 return `${margin(m)}every [ ${expr2esterel(o.func)} ] do\n`
	    + childrenOf(o, m + 3)
	    + `${margin(m)}end every\n`;
      case "loopeach":
	 return `${margin(m)}loopeach\n`
	    + o.children.map(c => json2esterel(c, m + 3)).join("\n")
	    + `${margin(m)}each [ ${expr2esterel(o.func)} ]\n`;
      default:
	 return `"Unsupported node ${o.node}"`;
   }
}

/*---------------------------------------------------------------------*/
/*    makeProg ...                                                     */
/*---------------------------------------------------------------------*/
function makeProg(prog, filename) {
   const evts = `(call-with-input-file "${filename}" read)`;
   const o = prog.tojson();
   
   return "%% generated by testrandom\n\n" + json2esterel(o, 0);
}

/*---------------------------------------------------------------------*/
/*    ReactiveMachine ...                                              */
/*---------------------------------------------------------------------*/
class ReactiveMachine {
   #strlfile = "/tmp/prog.hh.strl";
   #eventsfile = "/tmp/prog.hh.in";
   
   events = [];
   strlProg = undefined;
   opts = {};
   file;
   
   constructor (prog, opts) {
      this.file = opts?.file || this.#strlfile;
      this.eventsfile = opts?.eventsfile || this.#eventsfile;
      this.opts = opts;
      this.strlProg = makeProg(prog, this.eventsfile);
      writeFileSync(this.file, this.strlProg);
   }

   name() {
      return this.opts.name || "esterel"
   }
   
   react(e) {
      this.events.push(e);
   }

   reactDebug(e) {
      return this.react(e);
   }

   end() {
      const evt = this.events.map(e => e ? `${Object.keys(e).join(" ")}` + ";" : ";").join("\n");
      writeFileSync(this.eventsfile, "!trace signals;\n" + evt + "\n.\n");
      this.events = [];
      return this.run(this.file);
   }

   run(file) {
      // compile and run
      console.error(`sh -c "${require.resolve('./esterel.sh')} ${this.file}"`);
      const child = spawnSync("sh", ["-c", `${require.resolve('./esterel.sh')} ${this.file}`]);
      const out = child.stdout.toString();
      return JSON.parse(out);
   }

   outConf(suffix, {prog, events}) {
      const target = `esterel${suffix}.hh.strl`;
      writeFileSync(target, makeProg(prog, this.eventsFile) + `\n`);
      return target;
   }
}
