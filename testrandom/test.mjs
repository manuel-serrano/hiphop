/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/test.mjs           */
/*    -------------------------------------------------------------    */
/*    Author      :  robby findler & manuel serrano                    */
/*    Creation    :  Tue May 27 14:05:43 2025                          */
/*    Last change :  Thu Nov 27 13:55:45 2025 (serrano)                */
/*    Copyright   :  2025 robby findler & manuel serrano               */
/*    -------------------------------------------------------------    */
/*    HipHop Random Testing entry point.                               */
/*=====================================================================*/
import * as hh from "../lib/hiphop.js";
import { makeProp } from "./prop.mjs";
import { gen, gensym, genreactsigs } from "./gen.mjs";
import { filterinstantaneous } from "./filters.mjs";
import { shrink } from "./shrink.mjs";
import { jsonToHiphop, jsonToAst } from "./json.mjs";
import { parse } from "../preprocessor/parser.js";
import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { COUNT, MACHINES, VERBOSE, REASON } from "./config.mjs";
import * as racket from "./racket.mjs";
import * as esterel from "./esterel.mjs";

/*---------------------------------------------------------------------*/
/*    M ...                                                            */
/*---------------------------------------------------------------------*/
function M(name) {
   return MACHINES.indexOf(name) >= 0;
}

/*---------------------------------------------------------------------*/
/*    prop ...                                                         */
/*---------------------------------------------------------------------*/
export const prop = makeProp([
   M("default") && (prg => new hh.ReactiveMachine(prg, { name: "default" })),
   M("forkorkill") && (prg => new hh.ReactiveMachine(prg, { name: "forkorkill", forkOrKill: true })),
   M("no-loopunroll") && (prg => new hh.ReactiveMachine(prg, { name: "no-loopunroll", loopUnroll: false })),
   M("native") && (prg => new hh.ReactiveMachine(prg, { name: "native", native: "try" })),
   M("forcenative") && (prg => new hh.ReactiveMachine(prg, { name: "native", native: "force" })),
   M("no-unreachable") && (prg => new hh.ReactiveMachine(prg, { name: "no-unreachable", unreachable: false })),
   M("colin") && (prg => new hh.ReactiveMachine(prg, { name: "colin", compiler: "int" })),
   M("colin-no-sweep") && (prg => new hh.ReactiveMachine(prg, { name: "colin-no-sweep", compiler: "int", sweep: 0 })),
   M("colin-sweep-wire") && (prg => new hh.ReactiveMachine(prg, { name: "colin-no-sweep", compiler: "int", sweep: -1 })),
   M("racket") && (prg => new racket.ReactiveMachine(prg, { name: "racket" })),
   M("esterel") && (prg => new esterel.ReactiveMachine(prg, { name: "esterel" }))
].filter(x => x));

let k = 0;

/*---------------------------------------------------------------------*/
/*    shrinkBugInConf ...                                              */
/*---------------------------------------------------------------------*/
function shrinkBugInConf(conf, res) {
   const prop = makeProp(res.machines.map(m => prg => new m.constructor(prg, m.opts)));

   function shrinker(conf, res, margin) {
      const confs = shrink(conf);

      if (confs.length === 0) {
	 return { conf, res };
      } else {
	 if (VERBOSE) {
	    console.error("  |" + margin + "confs.length:", confs.length);
	 }
      
	 for (let i = 0; i < confs.length; i++) {
	    try {
	       const r = prop(confs[i]);
	       
	       if (VERBOSE >= 1) {
		  console.error("  |" + margin + " +-", r.status, r.msg);
		  if (VERBOSE >= 4) {
		     console.error(jsonToHiphop(confs[i].prog.tojson()));
		  }
	       }
	       if (r.status === "failure" && (REASON === false || r.reason === resreason)) {
		  writeFileSync(`/tmp/failure${k}.hh.mjs`, jsonToHiphop(confs[i].prog.tojson()));
		  console.error("K=", k++, r.status, r.msg, r.reason);
		  console.error("M=", r.machines[1].opts);
		  // we still have an error, shrink more
		  return shrinker(confs[i], r, margin + " ");
	       }
	    } catch(e) {
	       // an error occured, ignore that program
	       console.error("shrinker E=", e);
	       process.exit(1);
	       ;
	    }
	 }

	 if (VERBOSE >= 1) {
	    console.error("  |" + margin + " #- ending shrink with", res.status, res.msg);
	 }
	 
	 return { conf, res };
      }
   }

   console.error(` \\ shrinking...`);

   try {
      return shrinker(conf, res, "  ");
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
      console.log(`+- ${res.machines.map(m => m.name()).join(" / ")}`);
      const shrink = shrinkBugInConf(conf, res);
      return {
	 orig: conf,
	 shrink: shrink.conf,
	 res: shrink.res,
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
      
      const conf = gen({filters: [filterinstantaneous]});
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
/*    outConf ...                                                      */
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
   console.log("Testing:", MACHINES);
   
   if (argv.length < 3) {
      const bug = findBugInGen();

      if (bug) {
	 const jsonfile = "bug.hh.json";
	 const jsonfileorig = "bug.orig.hh.json";
	 console.log('  |');
	 console.log("  +-", bug.res.status, bug.res.msg);
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
