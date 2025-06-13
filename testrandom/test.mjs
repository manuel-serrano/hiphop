/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/test.mjs           */
/*    -------------------------------------------------------------    */
/*    Author      :  robby findler & manuel serrano                    */
/*    Creation    :  Tue May 27 14:05:43 2025                          */
/*    Last change :  Fri Jun 13 18:04:38 2025 (serrano)                */
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
/*    prg => new hh.ReactiveMachine(wrap(prg, fork2, 4), { name: "colin-wrap-fork", verbose: -1 }), */
/*    prg => new hh.ReactiveMachine(wrap(prg, loop, 4), { name: "colin-wrap-loop", verbose: -1 }), */
/*    prg => new hh.ReactiveMachine(wrap(prg, loopfork(0), 6), { name: "colin-wrap-loop-fork", verbose: -1 }), */
   prg => new hh.ReactiveMachine(prg, { name: "new-syncreg", compiler: "new", unrollLoop: false, reincarnation: false, dupLoop: true, verbose: -1 }),
/*    prg => new hh.ReactiveMachine(prg, { name: "new-syncreg", compiler: "new", unrollLoops: false, reincarnation: false, syncReg: true, verbose: -1 }) */
);

/*---------------------------------------------------------------------*/
/*    shrinkProgram ...                                                */
/*---------------------------------------------------------------------*/
function shrinkProgram(prog) {
   const progs = shrinker(prog);

   if (progs.length === 0) {
      return prog;
   } else {
      for (let i = 0; i < progs.length; i++) {
	 if (prop(progs[i]).status === "failure") {
	    // we still have an error
	    return shrinkProgram(progs[i]);
	 }
      }
      return prog;
   }
}

/*---------------------------------------------------------------------*/
/*    findBugInProg ...                                                */
/*---------------------------------------------------------------------*/
function findBugInProg(out, prog, events) {
   const res = prop(prog);

   if (res.status === "failure") {
      const shrunk = shrinkProgram(prog);
      const sres = prop(shrunk);

      const headers = [
	 `${res.machines[0].name()} / ${res.machines[1].name()}`,
	 sres.msg
      ];

      out(res.machines[1], headers, shrunk, events);
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
   
   function outSource(mach, headers, prog, events) {
      const json = prog.tojson();
      
      console.log("// generated by testrandom");
      headers.forEach(h => console.log(`// ${h}`));
      console.log(`
import * as hh from "@hop/hiphop";
		     
const events = ${JSON.stringify(events)};

const prg = hiphop ${jsonToHiphop(json, 0)}

const opts = { name: "${mach.name()}", compiler: "${mach.compiler}", unrollLoop: ${mach.unrollLoop}, reincarnation: ${mach.reincarnation}, syncDup: ${mach.syncDup}, syncReg: ${mach.syncReg} };
export const mach = new hh.ReactiveMachine(prg, opts);
mach.outbuf = "";
events.forEach((e, i) => mach.outbuf += (i + ': ' + JSON.stringify(mach.react(e)) + '\\n'));
console.log(mach.outbuf);`);
	 console.log("");
console.log(`// HIPHOP_SYNCDUP=false HIPHOP_SYNCREG=false HIPHOP_REINCARNATION=true xHIPHOP_SWEEP=-1 HIPHOP_COMPILER=int HIPHOP_UNROLL=false  NODE_OPTIONS="--enable-source-maps --no-warnings --loader @hop/hiphop/lib/hiphop-loader.mjs" node bug.hh.mjs`);
console.log(`// HIPHOP_SYNCDUP=${mach.syncDup ? "true" : "false"} HIPHOP_SYNCREG=${mach.syncReg ? "true" : "false"} HIPHOP_REINCARNATION=${mach.compiler === "new" ? "false" : "true"} xHIPHOP_SWEEP=-1 HIPHOP_COMPILER=${mach.compiler} HIPHOP_UNROLL=${mach.unrollLoop ? "true" : "false"} NODE_OPTIONS="--enable-source-maps --no-warnings --loader @hop/hiphop/lib/hiphop-loader.mjs" node bug.hh.mjs`);
   }

   function outJson(mach, headers, prog, events) {
      const json = prog.tojson();
      
      writeFileSync("/tmp/prog.hh.json", JSON.stringify({ events: events, prog: json }));
   }

   function out(mach, headers, prog, events) {
      outSource(mach, headers, prog, events);
      outJson(mach, headers, prog, events);
   }
   
   if (argv.length < 3) {
      findBugGen(out);
   } else if (existsSync(argv[2])) {
      const { events, prog } = JSON.parse(readFileSync(argv[2]));
      findBugInProg(outSource, prog, events);
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
