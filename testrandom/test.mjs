/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/test.mjs           */
/*    -------------------------------------------------------------    */
/*    Author      :  robby findler & manuel serrano                    */
/*    Creation    :  Tue May 27 14:05:43 2025                          */
/*    Last change :  Tue Dec  2 07:46:12 2025 (serrano)                */
/*    Copyright   :  2025 robby findler & manuel serrano               */
/*    -------------------------------------------------------------    */
/*    HipHop Random Testing entry point.                               */
/*=====================================================================*/
import { makeProp } from "./prop.mjs";
import { gen, gensym, genreactsigs } from "./gen.mjs";
import { filterinstantaneous } from "./filters.mjs";
import { shrink } from "./shrink.mjs";
import { jsonToAst } from "./json.mjs";
import { jsonToHiphop } from "./hiphop.mjs";
import { parse } from "../preprocessor/parser.js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { COUNT, MACHINES, VERBOSE, REASON } from "./config.mjs";
import * as hh from "./hiphop.mjs";
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
   M("default") && (prg => new hh.ReactiveMachine(prg, { name: "default", native: "no" })),
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
   const machines = res.machines;
   const prop = makeProp(machines.map(m => prg => new m.constructor(prg, m.opts)));

   function shrinker(conf, res, margin) {
      const confs = shrink(conf);
      writeFileSync(2, "!");

      if (confs.length === 0) {
	 return { conf, res };
      } else {
	 if (VERBOSE) {
	    console.error("  |" + margin + "confs.length:", confs.length);
	 }
      
	 for (let i = 0; i < confs.length; i++) {
	    try {
	       const r = prop(confs[i]);
	       writeFileSync(2, ".");
	       
	       if (VERBOSE >= 1) {
		  console.error("  |" + margin + " +-", r.status, r.msg);
		  if (VERBOSE >= 4) {
		     console.error(jsonToHiphop(confs[i].prog.tojson()));
		  }
	       }
	       if (r.status === "failure" && (REASON === false || r.reason === resreason)) {
		  // we still have an error, shrink more
		  return shrinker(confs[i], r, margin + " ");
	       }
	    } catch(e) {
	       // an error occured, ignore that program
	       if (VERBOSE >= 1) {
		  console.error("shrinker E=", e);
	       }
	    }
	 }

	 if (VERBOSE >= 1) {
	    console.error("  |" + margin + " #- ending shrink with", res.status, res.msg);
	 }
	 
	 return { conf, res };
      }
   }

   writeFileSync(2, " \\ shrinking ");

   try {
      return shrinker(conf, res, "  ");
   } catch(e) {
      console.error("*** SHRINK ERROR:", e.toString());
      throw e;
   } finally {
      console.error("");
   }
}

/*---------------------------------------------------------------------*/
/*    findBugInConf ...                                                */
/*---------------------------------------------------------------------*/
function findBugInConf(conf) {
   const res = prop(conf, VERBOSE);

   if (res.status === "failure") {
      console.log();
      console.log(`+- ${res.machines.map(m => m.name()).join("/")}`);
      const shrink = shrinkBugInConf(conf, res);
      return {
	 orig: conf,
	 shrink: shrink.conf,
	 res: shrink.res,
	 machines: res.machines,
	 status: res.status
      }
   } else {
      return res;
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

      if (bug.status !== "success") return bug;
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
/*    dumpBug ...                                                      */
/*---------------------------------------------------------------------*/
function dumpBug(bug) {
   bug.machines.forEach(m => {
      console.log("  +- see", m.outConf("", bug.shrink), `(${m.name()})`);
      console.log("  +- see", m.outConf(".orig", bug.orig), `(${m.name()})`);
   });
}

/*---------------------------------------------------------------------*/
/*    parseSrcFile ...                                                 */
/*---------------------------------------------------------------------*/
function parseSrcFile(filename) {

   function parseJsonFile(filename) {
      const srcfile = filename.replace(/hh.json/, "hh.mjs");
      const { events, prog } = JSON.parse(readFileSync(filename));
      const ast = jsonToAst(prog);
      return { srcfile, events, prog, ast };
   }
   
   function parseHiphopFile(filename) {
      throw new Error("Not implemented");
   }
   
   if (filename.match(/[.]json$/)) {
      return parseJsonFile(filename);
   } else {
      return parseHiphopFile(filename);
   }
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
      const jsonfile = "bug.hh.json";
      const { srcfile, events, prog, ast } = parseSrcFile(argv[2]);
      const bug = findBugInConf({ prog: ast, events });

      if (bug.status !== "success") {
	 dumpBug(bug);
      } else {
	 bug.res.forEach((r, i) => {
	    console.log(`[${i}]: ${r.status} ${JSON.stringify(r.signals)}`);
	 });
	 console.log("");
      }

      if (!existsSync(jsonfile)) {
	 console.log("see ${jsonfile}");
	 outJson(jsonfile, bug.shrink);
      }

      if (!existsSync(srcfile)) {
	 console.log(`see ${srcfile}`);
	 writeFileSync(srcfile, jsonToHiphop(prog));
      }
   } else {
      throw new Error(`Illegal command line: "${argv.join(" ")}"`);
   }
}

/*---------------------------------------------------------------------*/
/*    toplevel ...                                                     */
/*---------------------------------------------------------------------*/
main(process.argv);
