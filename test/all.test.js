/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/test/all.test.js              */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Tue Nov 21 07:42:24 2023                          */
/*    Last change :  Thu Feb 27 06:16:31 2025 (serrano)                */
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
import { existsSync, readdirSync, copyFileSync, unlinkSync } from 'fs';
import * as hiphop from "../lib/hiphop.js";

/*---------------------------------------------------------------------*/
/*    tests ...                                                        */
/*---------------------------------------------------------------------*/
let tests = [];

/*---------------------------------------------------------------------*/
/*    test ...                                                         */
/*---------------------------------------------------------------------*/
function test(f) {
   globalThis.it(basename(f), async () => {
      let error = true, nerror = true;;
      const nf = f.replace(/[.]hh[.]js/, ".nosweep.hh.js");
      copyFileSync(f, nf);
      
      try {
	 const m = await import(f);
	 error = await batch(m.mach, f);
	 const nm = await import(nf);
	 nerror = await batch(nm.mach, f);
      } catch (e) {
	 if (existsSync(join(dirname(f), basename(f).replace(/[.]hh[.]js$/, ".err")))) {
	    error = false;
	    nerror = false;
	 } else {
	    error = e;
	    nerror = e;
	 }
      } finally {
	 if (existsSync(nf)) unlinkSync(nf);
      }
	 
      assert.equal(error , false);
      assert.equal(nerror , false);
   });
}

/*---------------------------------------------------------------------*/
/*    main ...                                                         */
/*---------------------------------------------------------------------*/
async function main(argv) {
   const dir = dirname(fileURLToPath(import.meta.url));
   
   // MOCHA compatible conditional declarations.
   if (!("describe" in globalThis)) {
      globalThis.describe = function(name, thunk) {
	 console.log(name);
	 thunk();
      };
      globalThis.it = async function(name, thunk) {
	 const r = await thunk();
	 console.log("  " + name + "...", !r ? "ok" : "error");
	 
      }
      tests = [];
   }

   const idx = argv.indexOf("--");
   if (idx > 0) {
      tests = argv.slice(idx + 1);
   }

   // collect the whole tests list if none specified
   if (tests.length === 0) {
      
      const files = readdirSync(dir);
      tests = files
	 .filter(f => f.match(/.hh[.]js$/))
	 .map(f => join(dir,f));
   }

   // execute all the tests
   globalThis.describe("all.test.js", () => {
      tests.forEach(async f => test(f));
   });
}

/*---------------------------------------------------------------------*/
/*    toplevel                                                         */
/*---------------------------------------------------------------------*/
main(process.argv);
