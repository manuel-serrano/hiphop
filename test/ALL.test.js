/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/test/ALL.test.js              */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Tue Nov 21 07:42:24 2023                          */
/*    Last change :  Fri Dec 19 09:50:09 2025 (serrano)                */
/*    Copyright   :  2023-25 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    Testing driver.                                                  */
/*=====================================================================*/
'use strict';
'use hopscript';

/*---------------------------------------------------------------------*/
/*    import                                                           */
/*---------------------------------------------------------------------*/
import * as assert from 'assert';
import { batch } from '../lib/batch.js';
import { fileURLToPath } from 'node:url'
import { basename, dirname, join } from 'path';
import { existsSync, readdirSync, copyFileSync, unlinkSync, writeFileSync } from 'fs';
import * as hiphop from "../lib/hiphop.js";

/*---------------------------------------------------------------------*/
/*    tests ...                                                        */
/*---------------------------------------------------------------------*/
let tests = [];
let inMocha = true;

/*---------------------------------------------------------------------*/
/*    test ...                                                         */
/*---------------------------------------------------------------------*/
function test(f) {
   globalThis.it(basename(f), async () => {
      let res = true, nres = true;;
      const nf = f.replace(/[.]hh[.]js/, ".nosweep.hh.js");
      copyFileSync(f, nf);
      
      try {
	 hiphop.ReactiveMachine.setConfiguration({ Sweep: Number.MAX_SAFE_INTEGER });
	 const m = await import(f);
	 res = await batch(m.mach, f);
	 hiphop.ReactiveMachine.setConfiguration({ Sweep: 0 });
	 const nm = await import(nf);
	 nres = await batch(nm.mach, f);
      } finally {
	 if (existsSync(nf)) unlinkSync(nf);
      }

      if (res.got != res.expected) {
	 const fail = f.replace(/[.]hh[.]js/, ".sweep.log");
	 writeFileSync(fail, res.got);

	 if (!inMocha) {
	    console.error(`${f} failed... `);
	    console.error(`\x1B[31m\x1B[1mexpecting: \x1B[0m\n${res.expected}\x1B[32m\x1B[1msweep got: \x1B[0m\n${res.got}`);
	 }
	 throw new Error(`${f} failed...(see ${fail})`);
      }
      if (nres.got != nres.expected) {
	 const fail = f.replace(/[.]hh[.]js/, ".nosweep.log");
	 writeFileSync(fail, nres.got);
	 
	 if (!inMocha) {
	    console.error(`${f} failed... `);
	    console.error(`\x1B[31m\x1B[1mexpecting: \x1B[0m\n${res.expected}\x1B[32m\x1B[1mnosweep got: \x1B[0m\n${nres.got}`);
	 }
	 throw new Error(`${f} failed...(see ${fail})`);
      }
   });
}

/*---------------------------------------------------------------------*/
/*    main ...                                                         */
/*---------------------------------------------------------------------*/
async function main(argv) {
   const dir = dirname(fileURLToPath(import.meta.url));
   
   // MOCHA compatible conditional declarations.
   if (!("describe" in globalThis)) {
      inMocha = false;
      globalThis.describe = function(name, thunk) {
	 console.log(name);
	 thunk();
      };
      globalThis.it = async function(name, thunk) {
	 try {
	    const r = await thunk();
	    console.log("  " + name + "...", !r ? "ok" : "error");
	 } catch(e) {
	    console.log("  " + name + "...", "fail");
	    console.log(e);
	 }
      }
      tests = [];
   } else {
      inMocha = true;
   }

   let args = "";
   let idx = argv.indexOf("reincarnation");
   
   if (idx > 0) {
      hiphop.ReactiveMachine.setConfiguration({ LoopUnroll: false, Reincarnation: true });
      argv.splice(idx, 1);
      args += " reincarnation";
   }
   idx = argv.indexOf("old");
   if (idx > 0) {
      hiphop.ReactiveMachine.setConfiguration({ Compiler: "old", Reincarnation: true });
      argv.splice(idx, 1);
      args += " old";
   }
   idx = argv.indexOf("int");
   if (idx > 0) {
      hiphop.ReactiveMachine.setConfiguration({ Compiler: "int" });
      argv.splice(idx, 1);
      args += " int";
   }

   idx = argv.indexOf("--");
   if (idx > 0) {
      tests = argv.slice(idx + 1);
   }

   // collect the whole tests list if none specified
   if (tests.length === 0) {
      const files = readdirSync(dir);
      tests = files
	 .filter(f => f.match(/^[^.]+.hh[.]js$/))
	 .map(f => join(dir,f));
   }

   // execute all the tests
   globalThis.describe("ALL.test.js" + args, () => {
      tests.forEach(async f => test(f));
   });
}

/*---------------------------------------------------------------------*/
/*    toplevel                                                         */
/*---------------------------------------------------------------------*/
main(process.argv);
