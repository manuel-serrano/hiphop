/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/test.mjs           */
/*    -------------------------------------------------------------    */
/*    Author      :  robby findler & manuel serrano                    */
/*    Creation    :  Tue May 27 14:05:43 2025                          */
/*    Last change :  Fri Oct 24 16:27:36 2025 (serrano)                */
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
export const prop = makeProp(
   prg => new hh.ReactiveMachine(prg, { name: "colin-no-sweep", verbose: -1, sweep: 0 }),
   prg => new hh.ReactiveMachine(prg, { name: "colin-sweep-wire", verbose: -1, sweep: -1 }),
   prg => new hh.ReactiveMachine(prg, { name: "colin-sweep", verbose: -1 }),
/*    prg => new hh.ReactiveMachine(wrap(prg, fork2, 4), { name: "colin-wrap-fork", verbose: -1, wrap: true }), */
/*    prg => new hh.ReactiveMachine(wrap(prg, loop, 4), { name: "colin-wrap-loop", verbose: -1, wrap: true }), */
/*    prg => new hh.ReactiveMachine(wrap(prg, loopfork(0), 6), { name: "colin-wrap-loop-fork", verbose: -1, wrap: true }), */
   prg => new hh.ReactiveMachine(prg, { name: "new-unroll", compiler: "new", loopUnroll: true, reincarnation: false, loopDup: false, forkNoGo: true, verbose: -1 }),
   prg => new racket.ReactiveMachine(prg, { name: "racket" })
   
);

/*---------------------------------------------------------------------*/
/*    shrinkProgram ...                                                */
/*---------------------------------------------------------------------*/
function shrinkProgram(prog, prop, events) {
   const progs = shrinker(prog);

   if (progs.length === 0) {
      return prog;
   } else {
      for (let i = 0; i < progs.length; i++) {
	 if (prop(progs[i], events).status === "failure") {
	    // we still have an error, shrink more
	    return shrinkProgram(progs[i], prop, events);
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
      const shrunk0 = shrinkProgram(prog, prop, events);
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
   
   function outSource(headers, [mach0, mach1], [prog0, prog1], events) {
      const json = prog0.tojson();
      
      console.log("// generated by testrandom");
      headers.forEach(h => console.log(`// ${h}`));
      console.log(`
import * as hh from "@hop/hiphop";
		     
const events = ${JSON.stringify(events)};

const prg = hiphop ${jsonToHiphop(json, 0)}

const opts = { name: "${mach0.name()}", compiler: "${mach0.compiler}", loopUnroll: ${mach0.loopUnroll}, loopDup: ${mach0.loopDup}, reincarnation: ${mach0.reincarnation}, sweep: ${mach0.sweep} };
const opts2 = { name: "${mach1.name()}", compiler: "${mach1.compiler}", loopUnroll: ${mach1.loopUnroll}, loopDup: ${mach1.loopDup}, reincarnation: ${mach1.reincarnation}, sweep: ${mach1.sweep} };
export const mach = new hh.ReactiveMachine(prg, opts);
mach.outbuf = "";
events.forEach((e, i) => mach.outbuf += (i + ': ' + JSON.stringify(mach.react(e)) + '\\n'));
console.log(mach.outbuf);`);

      if (prog1) {
	 const json1 = prog1.tojson();
	 console.log(`
const prg1 = hiphop ${jsonToHiphop(json1, 0)}

const opts1 = { name: "${mach1.name()}", compiler: "${mach1.compiler}", loopUnroll: ${mach1.loopUnroll}, reincarnation: ${mach1.reincarnation}, sweep: ${mach1.sweep} };
export const mach1 = new hh.ReactiveMachine(prg1, opts1);
console.log("---------------");
mach1.outbuf = "";
events.forEach((e, i) => mach1.outbuf += (i + ': ' + JSON.stringify(mach1.react(e)) + '\\n'));
console.log(mach1.outbuf);`);
      }
      
	 console.log("");
console.log(`// HIPHOP_SWEEP=false HIPHOP_REINCARNATION=true xHIPHOP_SWEEP=-1 HIPHOP_COMPILER=int HIPHOP_UNROLL=false  NODE_OPTIONS="--enable-source-maps --no-warnings --loader @hop/hiphop/lib/hiphop-loader.mjs" node bug.hh.mjs`);
console.log(`// HIPHOP_SWEEP=${mach0.sweep ? "true" : "false"} HIPHOP_REINCARNATION=${mach0.compiler === "new" ? "false" : "true"} xHIPHOP_SWEEP=-1 HIPHOP_COMPILER=${mach0.compiler} HIPHOP_UNROLL=${mach0.loopUnroll ? "true" : "false"} NODE_OPTIONS="--enable-source-maps --no-warnings --loader @hop/hiphop/lib/hiphop-loader.mjs" node bug.hh.mjs`);
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
