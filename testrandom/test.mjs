/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/test.mjs           */
/*    -------------------------------------------------------------    */
/*    Author      :  robby findler & manuel serrano                    */
/*    Creation    :  Tue May 27 14:05:43 2025                          */
/*    Last change :  Thu Apr  9 08:34:36 2026 (serrano)                */
/*    Copyright   :  2025-26 robby findler & manuel serrano            */
/*    -------------------------------------------------------------    */
/*    HipHop Random Testing entry point.                               */
/*=====================================================================*/
import { Prop } from "./prop.mjs";
import { gen, gensym } from "./gen.mjs";
import { shrinkA, shrinkB } from "./shrink.mjs";
import { jsonToAst } from "./json.mjs";
import { jsonToHiphop } from "./hiphop.mjs";
import { parse } from "../preprocessor/parser.js";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { ITERATIONS, SYSTEMS, VERBOSE } from "./config.mjs";
import * as hh from "./hiphop.mjs";
import * as racket from "./racket.mjs";
import * as esterel from "./esterel.mjs";
import * as rocq from "./rocq.mjs";

/*---------------------------------------------------------------------*/
/*    prop ...                                                         */
/*---------------------------------------------------------------------*/
export const prop = new Prop(
   { name: "hiphop", ctor: (prg => new hh.ReactiveMachine(prg, { name: "hiphop", native: undefined })) },
   { name: "loopunroll", ctor: (prg => new hh.ReactiveMachine(prg, { name: "loopUnroll", native: undefined, reincarnation: false })) },
   { name: "trapunroll", ctor: (prg => new hh.ReactiveMachine(prg, { name: "trapUnroll", native: undefined, reincarnationTrap: false })) },
   { name: "int", ctor: (prg => new hh.ReactiveMachine(prg, { name: "int", native: undefined, compiler: "int", reincarnation: false })), config: { maxLoop: 3, maxSize: 10 } },
   { name: "nosweep", ctor: (prg => new hh.ReactiveMachine(prg, { name: "nosweep", native: false, sweep: 0 })) },
   { name: "nonative", ctor: (prg => new hh.ReactiveMachine(prg, { name: "nonative", native: false })) },
   { name: "racket", ctor: (prg => new racket.ReactiveMachine(prg, { name: "racket" })), config: { expr: 0, pre: 0 } },
   { name: "redex", ctor: (prg => new racket.ReactiveMachine(prg, { name: "redex", "backend": "redex" })), config: { expr: 0, present: 1, pre: 0, stdlib: 0, maxSize: 5  } },
   { name: "esterel", ctor: (prg => new esterel.ReactiveMachine(prg, { name: "esterel" })), config: { pre: 0 } },
   { name: "rocq", ctor: (prg => new rocq.ReactiveMachine(prg, { name: "rocq" })), config: { pre: 0, expr: 0 } },
   { name: "rocq-constructive", ctor: (prg => new rocq.ReactiveMachine(prg, { name: "rocq", semantics: "constructive" })), config: { pre: 0, expr: 0 } },
   { name: "rocq-state", ctor: (prg => new rocq.ReactiveMachine(prg, { name: "rocq", semantics: "state" })), config: { pre: 0, expr: 0 } }
);

/*---------------------------------------------------------------------*/
/*    shrinkBugInConf ...                                              */
/*---------------------------------------------------------------------*/
function shrinkBugInConf(conf, res, prop) {

   function shrinker(shrink, conf, res, margin) {
      const confs = shrink(conf, prop);
      writeFileSync(2, "!");

      if (confs.length === 0) {
	 return { conf, res,  margin };
      } else {
	 if (VERBOSE) {
	    console.error("  |" + margin + "confs.length:", confs.length);
	 }
      
	 for (let i = 0; i < confs.length; i++) {
	    try {
	       const r = prop.run(confs[i]);
	       writeFileSync(2, ".");

	       if (VERBOSE >= 1) {
		  console.error("  |" + margin + " +-", r.status, r.reason);
		  if (VERBOSE >= 2) {
		     console.error(jsonToHiphop(confs[i].prog.tojson()));
		  }
	       }
	       if (r.status === "failure") {
		  // we still have an error, shrink more
		  return shrinker(shrink, confs[i], r, margin + " ");
	       }
	    } catch(e) {
	       // an error occurred, ignore that program
	       if (VERBOSE >= 1) {
		  console.error("shrinker E=", e);
	       }
	       throw e;
	    }
	 }

	 if (VERBOSE >= 1) {
	    console.error("  |" + margin + " #- ending shrink with", res.status, res.reason);
	 }
	 
	 return { conf, res, margin };
      }
   }

   writeFileSync(2, " \\ shrinking ");

   try {
      const a = shrinker(shrinkA, conf, res, "  ");
      return shrinker(shrinkB, a.conf, a.res, a.margin);
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
function findBugInConf(conf, prop) {
   const res = prop.run(conf);

   switch (res.status) {
      case "failure":
	 console.log();
	 console.log(`+- ${res.systems.map(m => m.name).join("/")} (${res.reason})`);
	 const shrink = shrinkBugInConf(conf, res, prop);
	 return {
	    status: res.status,
	    origConf: conf,
	    shrinkConf: shrink.conf,
	    res: shrink.res,
	    systems: res.systems,
	    machines: res.machines,
	    runs: res.runs
	 }
      case "error":
	 console.log();
	 console.log(`+- ${res.machines.map(m => m.name()).join("/")} (${res.reason})`);
	 return res;
      default:
	 return {
	    status: res.status,
	    origConf: conf,
	    res,
	    systems: res.systems,
	    machines: res.machines,
	    runs: res.runs
	 };
   }
}

/*---------------------------------------------------------------------*/
/*    findBugInGen ...                                                 */
/*---------------------------------------------------------------------*/
function findBugInGen(prop, iterCount) {
   for (let i = iterCount; i != 0; i--) {
      writePadding(iterCount - i);

      const conf = gen(prop);
      const bug = findBugInConf(conf, prop);

      switch (bug?.status) {
	 case "reject": iterCount++; break;
	 case "failure": return bug;
	 case "error": return bug;
      }
   }
   
   return false;
}

/*---------------------------------------------------------------------*/
/*    pad ...                                                          */
/*---------------------------------------------------------------------*/
const pad = ["", " ", "  ", "   ", "    ", "     ", "      ", "       "];

/*---------------------------------------------------------------------*/
/*    padding ...                                                      */
/*---------------------------------------------------------------------*/
function padding(n, l) {
   const s = n + "";
   return pad[l - s.length] + s;
}

/*---------------------------------------------------------------------*/
/*    writePadding ...                                                 */
/*---------------------------------------------------------------------*/
function writePadding(i) {
   if (i % 72 === 0) {
      writeFileSync(1, "\n" + padding(i, 5) + " ");
   }
   writeFileSync(1, ".");
}

/*---------------------------------------------------------------------*/
/*    outJson ...                                                      */
/*---------------------------------------------------------------------*/
function outJson(target, { prog, events }) {
   writeFileSync(target, JSON.stringify({ events: events, prog: prog.tojson() }));
}

/*---------------------------------------------------------------------*/
/*    dumpBug ...                                                      */
/*---------------------------------------------------------------------*/
function dumpBug(dir, bug) {
   bug.machines.forEach((m, i, _) => {
      if (bug.shrinkConf) {
	 console.log("  +- see", m.outConf(dir, "", bug.shrinkConf), `(${m.name()})`);
      }
      console.log("  +- see", m.outConf(dir, ".orig", bug.origConf), `(${m.name()})`);
      const out = JSON.stringify(bug.runs[i]);
      writeFileSync(dir + "/" + m.name() + ".out.json", out);

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

      return { srcfile, events, prog: ast };
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
/*    mkDirname ...                                                    */
/*---------------------------------------------------------------------*/
function mkDirname(prefix) {
   const d = new Date();
   const ds = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}-${d.getHours()}:${d.getMinutes()}`;
   const dir = `${prefix}-${ds}`;

   return dir;
}

/*---------------------------------------------------------------------*/
/*    main                                                             */
/*---------------------------------------------------------------------*/
async function main(argv) {
   if (argv.length < 3) {
      const bug = findBugInGen(prop, ITERATIONS);

      if (bug) {
	 const dir = mkDirname(`out/${bug.machines.map(m => m.name()).join("-")}`);
	 const jsonfile = dir + "/bug.hh.json";
	 const jsonfileorig = dir + "/bug.orig.hh.json";
	 
	 mkdirSync(dir, { recursive: true });
	 
	 console.log('  |');
	 console.log("  +-", bug.status, `[${bug.res.reason}]`);
	 console.log('  |');
	 console.log(`  +- see ${jsonfile}`);
	 console.log(`  +- see ${jsonfileorig}`);
	 console.log('  |');
	 
	 outJson(jsonfile, bug.shrinkConf);
	 outJson(jsonfileorig, bug.origConf);
	 
	 dumpBug(dir, bug);
      }
   } else if (existsSync(argv[2])) {
      const dir = mkDirname(`out/${bug.machines.map(m => m.name).join("-")}`);
      const jsonfile = dir + "/bug.hh.json";
      const conf = parseSrcFile(argv[2]);
      const bug = findBugInConf(conf, prop);

      mkdirSync(dir, { recursive: true });
      
      console.log(bug.status, `[${bug.res.reason}]`);
      console.log("");

      bug.res.runs.forEach((r, i) => {
	 console.log(bug.systems[i].name + ":");
	 r.forEach((u, i) =>  {
	    console.log(`   [${i}]: ${u.status} ${JSON.stringify(u.signals)}`);
	 });
	 console.log("");
      });
      
      if (!existsSync(jsonfile)) {
	 console.log("see ${jsonfile}");
	 outJson(jsonfile, bug.shrink);
      }

      dumpBug(dir, bug);
   } else {
      throw new Error(`Illegal command line: "${argv.join(" ")}"`);
   }
}

/*---------------------------------------------------------------------*/
/*    toplevel ...                                                     */
/*---------------------------------------------------------------------*/
main(process.argv);
