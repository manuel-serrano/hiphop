/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/test.mjs           */
/*    -------------------------------------------------------------    */
/*    Author      :  robby findler & manuel serrano                    */
/*    Creation    :  Tue May 27 14:05:43 2025                          */
/*    Last change :  Fri Nov 14 11:20:47 2025 (serrano)                */
/*    Copyright   :  2025 robby findler & manuel serrano               */
/*    -------------------------------------------------------------    */
/*    HipHop Random Testing entry point.                               */
/*=====================================================================*/
import * as hh from "../lib/hiphop.js";
import { makeProp } from "./prop.mjs";
import { gen, gensym, genreactsigs } from "./gen.mjs";
import { shrinker } from "./shrink.mjs";
import { jsonToHiphop, jsonToAst } from "./dump.mjs";
import { parse } from "../preprocessor/parser.js";
import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import * as racket from "./racket.mjs";

/*---------------------------------------------------------------------*/
/*    COUNT                                                            */
/*---------------------------------------------------------------------*/
const COUNT = 5000;
const LOOPSAFE = process.env?.HIPHOP_RT_LOOPSAFE !== "false";
const REASON = process.env?.HIPHOP_RT_REASON === "true";
const VERBOSE = parseInt(process.env.HIPHOP_RT_VERBOSE) || 0;
const MACHINES = process.env.HIPHOP_RT_MACHINES?.split()
   ?? ["default", "colin" ];

/*---------------------------------------------------------------------*/
/*    M ...                                                            */
/*---------------------------------------------------------------------*/
function M(name) {
   return MACHINES.indexOf(name) >= 0;
}

/*---------------------------------------------------------------------*/
/*    prop ...                                                         */
/*---------------------------------------------------------------------*/
export const prop = makeProp(loopSafep, [
   M("default") && (prg => new hh.ReactiveMachine(prg, { name: "default" })),
   M("colin") && (prg => new hh.ReactiveMachine(prg, { name: "colin", compiler: "int" })),
   M("colin-no-sweep") && (prg => new hh.ReactiveMachine(prg, { name: "colin-no-sweep", compiler: "int", sweep: 0 })),
   M("colin-sweep-wire") && (prg => new hh.ReactiveMachine(prg, { name: "colin-no-sweep", compiler: "int", sweep: -1 })),
   M("default-unreachable") && (prg => new hh.ReactiveMachine(prg, { name: "new-unroll-no-unreachable", unreachable: false })),
   M("racket") && (prg => new racket.ReactiveMachine(prg, { name: "racket" }))
].filter(x => x));

/*---------------------------------------------------------------------*/
/*    loopSafep ...                                                    */
/*    -------------------------------------------------------------    */
/*    Is a program loop-safe?                                          */
/*---------------------------------------------------------------------*/
function loopSafep(prog) {
   if (LOOPSAFE) {
      try {
	 new hh.ReactiveMachine(prog, { loopSafe: true });
	 return true;
      } catch (e) {
	 return false;
      }
   } else {
      return true;
   }
}

/*---------------------------------------------------------------------*/
/*    shrinkBugInProg ...                                              */
/*---------------------------------------------------------------------*/
function shrinkBugInProg(prog, events, machines, reason) {
   const prop = makeProp(...machines.map(m => prg => new m.constructor(prg, m.opts)));

   function shrinker(prog) {
      const progs = shrink(prog);

      if (progs.length === 0) {
	 return { prog, machines, events };
      } else {
	 if (VERBOSE) {
	    console.error("  |  progs.length:", progs.length);
	 }
      
	 for (let i = 0; i < progs.length; i++) {
	    const res = prop(progs[i], events);
	    
	    if (VERBOSE) {
	       console.error("  |    +- ", res.status, res.reason);
	    }
	    if (res.status === "failure" && (REASON === false || res.reason === reason)) {
	       // we still have an error, shrink more
	       return shrinker(progs[i]);
	    }
	 }

	 return { prog, machines, events };
      }
   }

   console.error(` \\ shrinking...${machines.map(m => m.name()).join(", ")}`);

   return Object.assign(shrinker(prog), { orig: prog });
}

/*---------------------------------------------------------------------*/
/*    findBugInProg ...                                                */
/*---------------------------------------------------------------------*/
function findBugInProg(prog, events) {
   const res = prop(prog, events, VERBOSE);

   if (res.status === "failure") {
      console.log();
      console.log(`+- ${res.msg}: ${res.machines.map(m => m.name()).join(" / ")}`);
      return shrinkBugInProg(prog, events, res.machines, res.reason);
   } else {
      return false;
   }
}
   
/*---------------------------------------------------------------------*/
/*    findBugInGen ...                                                 */
/*---------------------------------------------------------------------*/
function findBugInGen(iterCount = COUNT) {
   const pad = ["", " ", "  ", "   ", "    "];
   
   function padding(n, l) {
      const s = n + "";
      return pad[l - s.length] + s;
   }

   for (let i = 0; i < iterCount; i++) {
      if (i % 72 === 0) {
	 writeFileSync(1, "\n" + padding(i, 5) + " ");
      } else {
	 writeFileSync(1, ".");
      }
      
      const { prog, signals } = gen({pred: LOOPSAFE ? loopSafep : false});
      const events = Array.from({length: 20}).map(i => genreactsigs(signals));

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
hh.ReactiveMachine.prototype.outProg = function(suffix, prog, events) {
   const target = this.name() + suffix + ".hh.mjs";
   const json = prog.tojson();
   let buf = "#!/bin/env -S node --enable-source-maps --no-warnings --loader @hop/hiphop/lib/hiphop-loader.mjs\n"
   buf += "// generated by testrandom\n";
   
   buf += (`
import * as hh from "@hop/hiphop";

const events = ${JSON.stringify(events)};

const prg = hiphop ${jsonToHiphop(json, 0)}

const opts = ${JSON.stringify(this.opts)};

export const mach = new hh.ReactiveMachine(prg, opts);
mach.outbuf = "";
try {
   events.forEach((e, i) => {
      mach.outbuf += (mach.name() + '[' + i + ']: '
         + JSON.stringify(mach.reactDebug(e)) + '\\n')
   });
} finally {
   console.log(mach.outbuf);
}
`);

   buf += "\n";
   buf += `// NODE_OPTIONS="--enable-source-maps --no-warnings --loader @hop/hiphop/lib/hiphop-loader.mjs" node ${target}\n`;

   writeFileSync(target, buf);
   chmodSync(target, "777");
   return target;
}
   
/*---------------------------------------------------------------------*/
/*    dumpBug ...                                                      */
/*---------------------------------------------------------------------*/
function dumpBug(bug) {
   bug.machines.forEach(m => {
      console.log("  +- see", m.outProg("", bug.prog, bug.events), `(${m.name()})`);
      console.log("  +- see", m.outProg("-orig", bug.orig, bug.events), `(${m.name()})`);
   });
}

/*---------------------------------------------------------------------*/
/*    main                                                             */
/*---------------------------------------------------------------------*/
async function main(argv) {
   if (argv.length < 3) {
      const bug = findBugInGen();

      if (bug) {
	 const jsonfile = "bug.hh.json";
	 const jsonfileorig = "bug.orig.hh.json";
	 console.log('  |');
	 console.log(`  +- see ${jsonfile}`);
	 console.log(`  +- see ${jsonfileorig}`);
	 console.log('  |');
	 outJson(jsonfile, bug.prog, bug.events);
	 outJson(jsonfileorig, bug.orig, bug.events);
	 dumpBug(bug);
      }
   } else if (existsSync(argv[2])) {
      const { events, prog } = JSON.parse(readFileSync(argv[2]));
      const bug = findBugInProg(jsonToAst(prog), events);

      if (bug) {
	 dumpBug(bug);
      }
   } else {
      throw new Error(`Illegal command line: "${argv.join(" ")}"`);
   }
}

/*---------------------------------------------------------------------*/
/*    toplevel ...                                                     */
/*---------------------------------------------------------------------*/
main(process.argv);
