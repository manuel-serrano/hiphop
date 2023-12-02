/*=====================================================================*/
/*    serrano/prgm/project/hiphop/1.3.x/tests/all.test.js              */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Tue Nov 21 07:42:24 2023                          */
/*    Last change :  Sat Dec  2 12:02:43 2023 (serrano)                */
/*    Copyright   :  2023 Manuel Serrano                               */
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
import { existsSync, readdirSync } from 'fs';

/*---------------------------------------------------------------------*/
/*    tests ...                                                        */
/*---------------------------------------------------------------------*/
let tests = [];

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
      tests = files.filter(f => f.match(/[.]hh[.]js$/)).map(f => join(dir,f));
   }

   // execute all the tests
   globalThis.describe("all.test.js", () => {
      tests.forEach(async f => {
	 globalThis.it(basename(f), async () => {
	    let error = true; // 
	    try {
	       const m = await import(f);
	       error = await batch(m.mach, f);
	    } catch (e) {
	       if (existsSync(join(dirname(f), basename(f).replace(/[.]hh[.]js$/, ".err")))) {
		  error = false;
	       } else {
		  error = e;
	       }
	    }
	    assert.equal(error , false);
	 });
      })
   });
}

/*---------------------------------------------------------------------*/
/*    toplevel                                                         */
/*---------------------------------------------------------------------*/
main(process.argv);
