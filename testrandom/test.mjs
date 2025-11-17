/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/test.mjs           */
/*    -------------------------------------------------------------    */
/*    Author      :  robby findler & manuel serrano                    */
/*    Creation    :  Tue May 27 14:05:43 2025                          */
/*    Last change :  Mon Nov 17 08:54:55 2025 (serrano)                */
/*    Copyright   :  2025 robby findler & manuel serrano               */
/*    -------------------------------------------------------------    */
/*    HipHop Random Testing entry point.                               */
/*=====================================================================*/
import * as hh from "../lib/hiphop.js";
import { makeProp } from "./prop.mjs";
import { gen, gensym, genreactsigs } from "./gen.mjs";
import { shrink } from "./shrink.mjs";
import { jsonToHiphop, jsonToAst } from "./json.mjs";
import { parse } from "../preprocessor/parser.js";
import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import * as racket from "./racket.mjs";

/*---------------------------------------------------------------------*/
/*    COUNT                                                            */
/*---------------------------------------------------------------------*/
const COUNT = parseInt(process.env.HIPHOP_RT_COUNT) || 5000;
const LOOPSAFE = process.env?.HIPHOP_RT_LOOPSAFE !== "false";
const REASON = process.env?.HIPHOP_RT_REASON === "true";
const VERBOSE = parseInt(process.env.HIPHOP_RT_VERBOSE) || 0;
const MACHINES = process.env.HIPHOP_RT_MACHINES?.split(" ")
   ?? ["default", "colin" ];

console.log("Testing:", MACHINES);

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
	 if (e.toString() !== "TypeError: Instantaneous loop detected") {
	    console.error("*** ERROR: ", e.toString());
	    console.error(jsonToHiphop(prog.tojson()));
	    throw e;
	 } else if (VERBOSE >= 3) {
	    console.error("*** ERROR: ", e.toString());
	 }
	 return false;
      }
   } else {
      return true;
   }
}

/*---------------------------------------------------------------------*/
/*    shrinkBugInConf ...                                              */
/*---------------------------------------------------------------------*/
function shrinkBugInConf(conf, machines, reason) {
   const prop = makeProp(loopSafep, machines.map(m => prg => new m.constructor(prg, m.opts)));

   function shrinker(conf, margin) {
      const confs = shrink(conf);

      if (confs.length === 0) {
	 return conf;
      } else {
	 if (VERBOSE) {
	    console.error("  |" + margin + "confs.length:", confs.length);
	 }
      
	 for (let i = 0; i < confs.length; i++) {
	    const res = prop(confs[i]);
	    
	    if (VERBOSE) {
	       console.error("  |" + margin + " +- ", res.status, res.reason);
	       if (VERBOSE >= 4) {
		  console.error(jsonToHiphop(confs[i].prog.tojson()));
	       }
	    }
	    if (res.status === "failure" && (REASON === false || res.reason === reason)) {
	       // we still have an error, shrink more
	       return shrinker(confs[i], margin + " ");
	    }
	 }

	 return conf;
      }
   }

   console.error(` \\ shrinking...${machines.map(m => m.name()).join(", ")}`);

   try {
      return shrinker(conf, "  ");
   } catch(e) {
      console.error("*** SHRINK ERROR:", e.toString());
      throw e;
   }
}

/*---------------------------------------------------------------------*/
/*    findBugInConf ...                                                */
/*---------------------------------------------------------------------*/
function findBugInConf(conf) {
   const res = prop(conf, VERBOSE);

   if (res.status === "failure") {
      console.log();
      console.log(`+- ${res.msg}: ${res.machines.map(m => m.name()).join(" / ")}`);
      return {
	 orig: conf,
	 shrink: shrinkBugInConf(conf, res.machines, res.reason),
	 machines: res.machines,
      }
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
      }
      writeFileSync(1, ".");
      
      const conf = gen({pred: loopSafep});
      const bug = findBugInConf(conf);

      if (bug) return bug;
   }
   return false;
}

/*---------------------------------------------------------------------*/
/*    outJson ...                                                      */
/*---------------------------------------------------------------------*/
function outJson(target, {prog, events}) {
   writeFileSync(target, JSON.stringify({ events: events, prog: prog.tojson() }));
}

/*---------------------------------------------------------------------*/
/*    outProg ...                                                      */
/*---------------------------------------------------------------------*/
hh.ReactiveMachine.prototype.outConf = function(suffix, {prog, events}) {
   const target = this.name() + suffix + ".hh.mjs";
   const json = prog.tojson();
   let buf = "#!/bin/env -S node --enable-source-maps --no-warnings --loader @hop/hiphop/lib/hiphop-loader.mjs\n"
   buf += `// generated by testrandom (${hh.version} - ${hh.buildid})`;
   
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
      console.log("  +- see", m.outConf("", bug.shrink), `(${m.name()})`);
      console.log("  +- see", m.outConf(".orig", bug.orig), `(${m.name()})`);
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
	 outJson(jsonfile, bug.shrink);
	 outJson(jsonfileorig, bug.orig);
	 dumpBug(bug);
      }
   } else if (existsSync(argv[2])) {
      const { events, prog } = JSON.parse(readFileSync(argv[2]));
      const bug = findBugInConf({ prog: jsonToAst(prog), events });

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
