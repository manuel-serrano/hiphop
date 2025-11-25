/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/esterel.mjs        */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Fri Oct 24 16:29:15 2025                          */
/*    Last change :  Tue Nov 25 12:34:36 2025 (serrano)                */
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
/*    gensym ...                                                       */
/*---------------------------------------------------------------------*/
let G = 0;
function gensym() {
   return `gg${G++}`;
}

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
	       return obj.value === "true" ? "TRUE" : "FALSE";
	    case "sig":
	       if (obj.prop === "now") {
		  return `${obj.value}`;
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
	 return o.children.map(c => json2esterel(c, m)).join(`${margin(m)};\n`);
      }
   }

   switch (o.node) {
      case "module":
	 return "module M :\n"
	    + "input TRUE, FALSE;\n"
	    + (o.signals.length ? (o.signals.map(s => `inputoutput ${s} := 0 : combine integer with +;\n`).join("") + "\n") : "\n")
	    + childrenOf(o, m)
	    + (o.children.length === 0 ? "nothing\n" : "")
	    + "\nend module\n";
      case "loop":
	 return `${margin(m)}loop\n`
	    + childrenOf(o, m + 3)
	    + `${margin(m)}end loop\n`
      case "if":
	 return `${margin(m)}present ${expr2esterel(o.func)} then\n`
	    + json2esterel(o.children[0], m + 3)
	    + `${margin(m)}else\n`
	    + json2esterel(o.children[1], m + 3)
	    + `${margin(m)}end present\n`;
      case "local":
	 return `${margin(m)}signal `
	    + (o.signals.length ? (o.signals.map(s => `${s} := 0 : combine integer with +`).join(", ") + " in\n") : `${gensym()} in\n`)
	    + childrenOf(o, m + 3)
	    + `${margin(m)}end signal\n`
      case "nothing":
	 return `${margin(m)}nothing\n`;
      case "pause":
	 return `${margin(m)}pause\n`;
      case "seq":
	 return childrenOf(o, m);
      case "trap":
	 return `${margin(m)}trap ${o.trapName} in\n`
	    + childrenOf(o, m + 3) + "\n"
	    + `${margin(m)}end trap\n`;
      case "exit":
	 return `${margin(m)}exit ${o.trapName}\n`
      case "halt":
	 return `${margin(m)}halt\n`;
      case "par":
	 return `${margin(m)}[\n${o.children.map(c => json2esterel(c, m + 3)).join(`${margin(m)}||\n`)}${margin(m)}]\n`;
      case "atom":
	 return `${margin(m)}present (${expr2esterel(o.func)}) then nothing; end present %% atom\n`;
      case "emit":
	 return `${margin(m)}emit ${o.signame}(${o.value})\n`;
      case "abort":
	 return `${margin(m)}abort\n`
	    + o.children.map(c => json2esterel(c, m + 3)).join("\n")
	    + `${margin(m)}when [ ${expr2esterel(o.func)} ]\n`
      case "every":
	 return `${margin(m)}every [ ${expr2esterel(o.func)} ] do\n`
	    + childrenOf(o, m + 3)
	    + `${margin(m)}end every\n`;
      case "loopeach":
	 return `${margin(m)}loop\n`
	    + o.children.map(c => json2esterel(c, m + 3)).join("\n")
	    + `${margin(m)}each [ ${expr2esterel(o.func)} ]\n`;
      default:
	 return `"Unsupported node ${o.node}"`;
   }
}

/*---------------------------------------------------------------------*/
/*    makeProg ...                                                     */
/*---------------------------------------------------------------------*/
function makeProg(prog, srcfile, infile) {
   
   function relative(from, to) {
      if (from.indexOf(to) === 0) {
	 return from.substring(to.length + 1);
      } else {
	 return from;
      }
   }
   
   const o = prog.tojson();
   const cwd = process.cwd();

   return "%% generated by testrandom\n\n"
      + json2esterel(o, 0)
      + "\n"
      + `%% ${require.resolve('./esterel.sh')} ${relative(srcfile, cwd)} ${relative(infile, cwd)} | ${require.resolve('./esterel-outparse.mjs')}\n`;
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
      this.strlProg = makeProg(prog, this.file, this.eventsfile);
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
      const evt = ReactiveMachine.events2in(this.events);
      writeFileSync(this.eventsfile, "!trace signals;\n" + evt + "\n.\n");
      this.events = [];
      return this.run(this.file);
   }

   run(file) {
      // compile and run
      const child = spawnSync("sh", ["-c", `${require.resolve('./esterel.sh')} ${this.file} ${this.eventsfile}`]);
      const out = child.stdout.toString();
      return JSON.parse(out);
   }

   outConf(suffix, {prog, events}) {
      const target = `esterel${suffix}.hh.strl`;
      const infile = `esterel${suffix}.hh.in`;
      const evt = ReactiveMachine.events2in(events);
      
      writeFileSync(infile, "!trace signals;\n" + evt + "\n.\n");
      writeFileSync(target, makeProg(prog, target, infile) + `\n`);
      
      return target;
   }

   static events2in(events) {
      return events.map(e => e ? `TRUE ${Object.keys(e).map(s => `${s}(${e[s]})`).join(" ")}` + ";" : "TRUE;").join("\n");
   }
}
