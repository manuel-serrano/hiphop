/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/test.mjs           */
/*    -------------------------------------------------------------    */
/*    Author      :  robby findler & manuel serrano                    */
/*    Creation    :  Tue May 27 14:05:43 2025                          */
/*    Last change :  Wed Oct 29 07:29:36 2025 (serrano)                */
/*    Copyright   :  2025 robby findler & manuel serrano               */
/*    -------------------------------------------------------------    */
/*    HipHop Random Testing entry point.                               */
/*=====================================================================*/
import * as hh from "../lib/hiphop.js";
import { makeProp } from "./prop.mjs";
import { gen, wrap, gensym } from "./gen.mjs";
import { shrinker } from "./shrink.mjs";
import { jsonToHiphop, jsonToAst } from "./dump.mjs";
import { parse } from "../preprocessor/parser.js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import * as racket from "./racket.mjs";

/*---------------------------------------------------------------------*/
/*    COUNT                                                            */
/*---------------------------------------------------------------------*/
const COUNT = 2000;

/*---------------------------------------------------------------------*/
/*    fork2 ...                                                        */
/*    -------------------------------------------------------------    */
/*    Create a binary fork for testing.                                */
/*---------------------------------------------------------------------*/
function fork2(attrs, body) {
   return hh.FORK(attrs, hh.NOTHING({}), body);
}

/*---------------------------------------------------------------------*/
/*    loop ...                                                         */
/*---------------------------------------------------------------------*/
function loop(attrs, body) {
   const trap = gensym("trap");
   const attr = {[trap]: trap};
   return hh.TRAP(attr, hh.LOOP({}, hh.SEQUENCE({}, body, hh.EXIT(attr))));
}

/*---------------------------------------------------------------------*/
/*    loopfork ...                                                     */
/*---------------------------------------------------------------------*/
function loopfork(n) {
   return (attrs, body) => {
      if (n++ & 1 === 1) {
	 return fork2(attrs, body);
      } else {
	 return loop(attrs, body);
      }
   }
}
	 
/*---------------------------------------------------------------------*/
/*    prop ...                                                         */
/*---------------------------------------------------------------------*/
export const prop = makeProp(true, 
/*    prg => new hh.ReactiveMachine(prg, { name: "colin-no-sweep", verbose: -1, sweep: 0 }), */
/*    prg => new hh.ReactiveMachine(prg, { name: "colin-sweep-wire", verbose: -1, sweep: -1 }), */
/*    prg => new hh.ReactiveMachine(prg, { name: "colin-sweep", verbose: -1 }), */
   prg => new hh.ReactiveMachine(prg, { name: "new-unroll", compiler: "new", loopUnroll: true, reincarnation: false, loopDup: false, verbose: -1 }),
   prg => new racket.ReactiveMachine(prg, { name: "racket" })
   
);

/*---------------------------------------------------------------------*/
/*    shrinkProgram ...                                                */
/*---------------------------------------------------------------------*/
function shrinkProgram(prog, prop, events, reason) {
   const progs = shrinker(prog);

   if (progs.length === 0) {
      return prog;
   } else {
      for (let i = 0; i < progs.length; i++) {
	 const res = prop(progs[i], events);
	 if (res.status === "failure" && res.reason === reason) {
	    console.error("   size: ", progs.length);
	    // console.error("FAIL=", progs.length, res.status, res.msg, res.reason, reason);
	    // we still have an error, shrink more
	    return shrinkProgram(progs[i], prop, events, reason);
	 }
      }
      return prog;
   }
}

/*---------------------------------------------------------------------*/
/*    findBugInProg ...                                                */
/*---------------------------------------------------------------------*/
function findBugInProg(out, prog, events) {
   const res = prop(prog, events);

   if (res.status === "failure") {
      const [mach0, mach1] = res.machines;

      const prop = makeProp(false, 
	 prg => new mach0.constructor(prg, mach0.opts),
	 prg => new mach1.constructor(prg, mach1.opts));

      console.error(`! shrinking...(${mach0.name()}, ${mach1.name()})`);
      
      const shrunk0 = shrinkProgram(prog, prop, events, res.reason);
      const shrunk1 = mach1.opts.wrap ? jsonToAst(mach1.ast.tojson()) : false;
      const headers = [`${mach0.name()} / ${mach1.name()}`, res.msg];

      out(headers, res.machines, [shrunk0, shrunk1] , events);
	 
      process.exit(0);
   } else {
      ;
   }
}
   
/*---------------------------------------------------------------------*/
/*    findBugGen ...                                                   */
/*---------------------------------------------------------------------*/
function findBugGen(out, iterCount = COUNT) {
   for (let i = 0; i < iterCount; i++) {
      const events = Array.from({length: 20}).map(i => { return {}; });
      const prog = gen();
      console.error("#", i);

      findBugInProg(out, prog, events);
   }
}

/*---------------------------------------------------------------------*/
/*    main                                                             */
/*---------------------------------------------------------------------*/
async function main(argv) {

   const outFile = "/tmp/prog.hh.mjs";
   
   function outResults(headers) {
      console.log("// generated by testrandom");
      headers.forEach(h => console.log(`// ${h}`));
   }
   
   function outSource(headers, [mach0, mach1], [prog0, prog1], events) {
      const json = prog0.tojson();
      let buf = "// generated by testrandom\n";
      
      headers.forEach(h => buf += `// ${h}\n`);
      buf += (`
import * as hh from "@hop/hiphop";
		     
const events = ${JSON.stringify(events)};

const prg = hiphop ${jsonToHiphop(json, 0)}

const opts0 = ${JSON.stringify(mach0.opts)};
const opts1 = ${JSON.stringify(mach1.opts)};
export const mach = new hh.ReactiveMachine(prg, process.env?.HIPHOP_MACHINE === "mach1" ? opts1 : opts0);
mach.outbuf = "";
events.forEach((e, i) => { console.log(mach.name() + ":", i); mach.outbuf += (i + ': ' + JSON.stringify(mach.react(e)) + '\\n') });
console.log(mach.outbuf);
`);

      if (prog1) {
	 const json1 = prog1.tojson();
	 buf += (`
const prg1 = hiphop ${jsonToHiphop(json1, 0)}

const opts1 = ${JSON.stringify(mach1.opts)};
export const mach1 = new hh.ReactiveMachine(prg1, opts1);
console.log("---------------");
mach1.outbuf = "";
events.forEach((e, i) => mach1.outbuf += (i + ': ' + JSON.stringify(mach1.react(e)) + '\\n'));
console.log(mach1.outbuf);
`);
      }

      buf += "\n";
      buf += `// HIPHOP_MACHINE=mach0 NODE_OPTIONS="--enable-source-maps --no-warnings --loader @hop/hiphop/lib/hiphop-loader.mjs" node ${outFile}\n`;

      writeFileSync(outFile, buf);

      console.log(`// see "${outFile}"`);
   }

   function outJson(headers, [mach0, mach1], [prog0, prog1], events) {
      writeFileSync("/tmp/prog.hh.json",
		    JSON.stringify({ events: events, prog: prog0.tojson() }));
      if (prog1) {
	 writeFileSync("/tmp/prog1.hh.json",
		       JSON.stringify({ events: events, prog: prog1.tojson() }));
      }
   }

   function out(headers, machines, progs, events) {
      outResults(headers, machines, progs, events);
      outSource(headers, machines, progs, events);
      outJson(headers, machines, progs, events);
   }
   
   if (argv.length < 3) {
      findBugGen(out);
   } else if (existsSync(argv[2])) {
      const { events, prog } = JSON.parse(readFileSync(argv[2]));
      findBugInProg(outSource, jsonToAst(prog), events);
   } else if (argv[2] === "gen") {
      console.log(jsonToHiphop(gen().tojson()));
   } else {
      throw new Error(`Illegal command line: "${argv.join(" ")}"`);
   }
}

/*---------------------------------------------------------------------*/
/*    toplevel ...                                                     */
/*---------------------------------------------------------------------*/
main(process.argv);
