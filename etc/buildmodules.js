/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/etc/buildmodules.js           */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Thu Dec  7 10:09:27 2023                          */
/*    Last change :  Mon Apr  8 10:12:17 2024 (serrano)                */
/*    Copyright   :  2023-24 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    Compiling HipHop standard modules                                */
/*=====================================================================*/

/*---------------------------------------------------------------------*/
/*    import                                                           */
/*---------------------------------------------------------------------*/
import { readdirSync } from "fs";
import { join } from "path";
import { compile } from "../lib/hhc-compiler.mjs";

/*---------------------------------------------------------------------*/
/*    Compile all modules in sequence                                  */
/*---------------------------------------------------------------------*/
async function compileAll() {
   for (let file of readdirSync("modules")) {
      if (file.match(/\.hh\.js$/)) {
	 const src = join("modules", file);
	 const tgt = src.replace(/\.hh\.js$/, ".js");
	 
	 const fragment = compile(src, {});
	 await fragment.output(tgt);
	 await fragment.sourcemap(tgt);
      }
   }
}

await compileAll();

