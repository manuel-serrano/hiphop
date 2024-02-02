/*=====================================================================*/
/*    serrano/prgm/project/hiphop/1.3.x/lib/hiphop.js                  */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal                                       */
/*    Creation    :  Mon Jul 16 11:23:59 2018                          */
/*    Last change :  Fri Feb  2 08:28:54 2024 (serrano)                */
/*    Copyright   :  2018-24 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    HipHop language definition                                       */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
export * from "hiphop-client.mjs"
import { parseString } from "../preprocessor/parser.js";

/*---------------------------------------------------------------------*/
/*    compileString ...                                                */
/*---------------------------------------------------------------------*/
export function compileString(str) {
   return parseString(`(() => {return ${str}})()\n`).generate().toString();
}
