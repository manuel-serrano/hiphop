/*=====================================================================*/
/*    serrano/prgm/project/hiphop/1.3.x/lib/hhc.js                     */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Wed Oct 25 08:13:33 2023                          */
/*    Last change :  Tue Mar 19 07:48:31 2024 (serrano)                */
/*    Copyright   :  2023-24 manuel serrano                            */
/*    -------------------------------------------------------------    */
/*    HipHop compiler                                                  */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
import { compile } from "./hhc-compiler.mjs";

/*---------------------------------------------------------------------*/
/*    usage ...                                                        */
/*---------------------------------------------------------------------*/
function usage(argv, i) {
   if (i >= 0) {
      console.log(`hhc: wrong option "${argv[i]}" (see hhc --help)`);
   } else {
      console.log("hhc usage: source [-o target] [--help]");
   }
   process.exit(0);
}

/*---------------------------------------------------------------------*/
/*    main ...                                                         */
/*---------------------------------------------------------------------*/
async function main(argv) {
   let src = undefined;
   let tgt = undefined;
   let i = 2;

   while (i < argv.length) {
      switch (argv[i]) {
	 case "--help": {
	    usage(argv, -1);
	 }
	 case "-o": {
	    if (i < argv.length - 1) {
	       tgt = argv[i+1];
	       i += 2;
	       break;
	    } else {
	       usage(argv, i);
	    }
	 }
	 default: {
	    if (src) {
	       usage(argv, i);
	    } else {
	       src = argv[i];
	       i++;
	       break;
	    }
	 }
      }
   }

   if (!src) {
      usage(argv, -1);
   } else {
      const conf = src.match(/\.ts$/) ? { typescript: true } : {};
      const prog = compile(src, conf);
      await prog.output(tgt);
      await prog.sourcemap(tgt);
   }
}

/*---------------------------------------------------------------------*/
/*    toplevel                                                         */
/*---------------------------------------------------------------------*/
main(process.argv);
