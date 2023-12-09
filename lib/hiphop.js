/*=====================================================================*/
/*    serrano/prgm/project/hiphop/1.3.x/lib/hiphop.js                  */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal                                       */
/*    Creation    :  Mon Jul 16 11:23:59 2018                          */
/*    Last change :  Sat Dec  9 19:12:42 2023 (serrano)                */
/*    Copyright   :  2018-23 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    HipHop language definition                                       */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
export { version, isServer, CAUSALITY_JSON } from "./config.js";
export { ReactiveMachine } from "./machine.js";
export * from "./error.js";
export * from "./lang.js";
export { IN, OUT, INOUT } from "./ast.js";

import * as Parser from "../preprocessor/parser.js";
import { isServer } from "./config.js";

/*---------------------------------------------------------------------*/
/*    language compiler (pre-processor)                                */
/*---------------------------------------------------------------------*/
function compiler(ifile, conf) {
   return {
      type: "ast",
      value: Parser.parse(ifile, conf)
   }
}

function script(attrs) {
   return {
      type: "string",
      value: Parser.script(attrs)
   }
}

if (isServer) {
   Parser.setHHModulePath(import.meta.url);
   compiler.parser = Parser.parser;
   exports[Symbol.compiler] = compiler;
   exports[Symbol.script] = script;

   exports.eval = function(str) {
      return eval(Parser.parseString(`(function() {return ${str}})()`));
   }
}
