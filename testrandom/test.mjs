/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/test.mjs           */
/*    -------------------------------------------------------------    */
/*    Author      :  robby findler & manuel serrano                    */
/*    Creation    :  Tue May 27 14:05:43 2025                          */
/*    Last change :  Tue Nov  4 12:38:01 2025 (serrano)                */
/*    Copyright   :  2025 robby findler & manuel serrano               */
/*    -------------------------------------------------------------    */
/*    HipHop Random Testing entry point.                               */
/*=====================================================================*/
import * as hh from "../lib/hiphop.js";
import { makeProp } from "./prop.mjs";
import { gen, gensym } from "./gen.mjs";
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
/*    prg => new hh.ReactiveMachine(prg, { name: "colin-sweep-wire", verbose: -1, sweep: -1 }), */
/*    prg => new hh.ReactiveMachine(prg, { name: "colin-sweep", verbose: -1 }), */
   prg => new hh.ReactiveMachine(prg, { name: "new-unroll", compiler: "new", loopUnroll: true, reincarnation: false, loopDup: false, verbose: -1 }),
/*    prg => new racket.ReactiveMachine(prg, { name: "racket" })       */
);

/*---------------------------------------------------------------------*/
/*    shrinkBugInProg ...                                              */
/*---------------------------------------------------------------------*/
function shrinkBugInProg(prog, machines, events, reason) {
   /*    const [mach0, mach1] = machines;                                 */

   const prop = makeProp(...machines.map(m => prg => new m.constructor(prg, m.opts)));
   /*          prg => new mach0.constructor(prg, mach0.opts),             */
   /*          prg => new mach1.constructor(prg, mach1.opts));            */

   function shrink(prog) {
      const progs = shrinker(prog);
      
      console.error("  |  size: ", progs.length);
      
      if (progs.length === 0) {
	 return { prog, machines, events };
      } else {
	 for (let i = 0; i < progs.length; i++) {
	    const res = prop(progs[i], events);
	    if (res.status === "failure" && res.reason === reason) {
	       // we still have an error, shrink more
	       return shrink(progs[i]);
	    }
	 }
	 
	 return { prog, machines, events };
      }
   }

   console.error(` \\ shrinking...${machines.map(m => m.name()).join(", ")}`);

   return shrink(prog);
}

/*---------------------------------------------------------------------*/
/*    findBugInProg ...                                                */
/*---------------------------------------------------------------------*/
function findBugInProg(prog, events) {
   const res = prop(prog, events, true);

   if (res.status === "failure") {
      console.log(`+- ${res.msg}: ${res.machines.map(m => m.name()).join(" / ")}`);
      return shrinkBugInProg(prog, res.machines, events, res.reason);
   } else {
      return false;
   }
}
   
/*---------------------------------------------------------------------*/
/*    findBugInGen ...                                                 */
/*---------------------------------------------------------------------*/
function findBugInGen(iterCount = COUNT) {
   for (let i = 0; i < iterCount; i++) {
      const events = Array.from({length: 20}).map(i => { return {}; });
      const prog = gen();
      
      console.error("#", i);

      const bug = findBugInProg(prog, events);

      if (bug) return bug;
   }
   return false;
}

/*---------------------------------------------------------------------*/
/*    outJson ...                                                      */
/*---------------------------------------------------------------------*/
function outJson(target, prog, events) {
   writeFileSync(target, JSON.stringify({ events: events, prog: prog.tojson() }));
}

/*---------------------------------------------------------------------*/
/*    outProg ...                                                      */
/*---------------------------------------------------------------------*/
function outProg(mach, prog, events) {
   const target = mach.name() + ".hh.mjs";
   const json = prog.tojson();
   let buf = "// generated by testrandom\n";
   
   buf += (`
import * as hh from "@hop/hiphop";

const events = ${JSON.stringify(events)};

const prg = hiphop ${jsonToHiphop(json, 0)}
const opts = ${JSON.stringify(mach.opts)};

export const mach = new hh.ReactiveMachine(prg, opts);
mach.outbuf = "";
events.forEach((e, i) => { console.log(mach.name() + ":", i); mach.outbuf += (i + ': ' + JSON.stringify(mach.react(e)) + '\\n') });
console.log(mach.outbuf);
`);

   buf += "\n";
   buf += `// NODE_OPTIONS="--enable-source-maps --no-warnings --loader @hop/hiphop/lib/hiphop-loader.mjs" node ${target}\n`;

   writeFileSync(target, buf);
   return target;
}

/*---------------------------------------------------------------------*/
/*    main                                                             */
/*---------------------------------------------------------------------*/
async function main(argv) {
   if (argv.length < 3) {
      const bug = findBugInGen();

      if (bug) {
	 const jsonfile = "bug.hh.json";
	 outJson(jsonfile, bug.prog, bug.events);
	 console.log(`  +- see ${jsonfile}`);
	 bug.machines.forEach(m =>
	    console.log("  +- see", m.outProg?.(bug.prog, bug.events) || outProg(m, bug.prog, bug.events),
			`(${m.name()})`));
      }
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
