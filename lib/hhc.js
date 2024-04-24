/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/hhc.js                    */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Wed Oct 25 08:13:33 2023                          */
/*    Last change :  Fri Apr  5 11:50:09 2024 (serrano)                */
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
      try {
	 const conf = src.match(/\.ts$/) ? { typescript: true } : {};
	 const fragment = compile(src, conf);
	 await fragment.output(tgt);
	 await fragment.sourcemap(tgt);
      } catch(e) {
	 console.error(e);
      }
   }
}

/*---------------------------------------------------------------------*/
/*    toplevel                                                         */
/*---------------------------------------------------------------------*/
main(process.argv);
