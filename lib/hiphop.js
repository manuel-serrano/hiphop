/*=====================================================================*/
/*    serrano/prgm/project/hiphop/1.3.x/lib/hiphop.js                  */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal                                       */
/*    Creation    :  Mon Jul 16 11:23:59 2018                          */
/*    Last change :  Thu Feb  1 07:26:08 2024 (serrano)                */
/*    Copyright   :  2018-24 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    HipHop language definition                                       */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
export * from "./machine.js";
export * from "./lang.js";
export { IN, OUT, INOUT } from "./ast.js";
import { parseStringP from "../preprocessor/parser.js";

/*---------------------------------------------------------------------*/
/*    compileString ...                                                */
/*---------------------------------------------------------------------*/
function compileString(str) {
   return parseString(`(() => {return ${str}})()\n`).generate().toString();
}
