/*=====================================================================*/
/*    serrano/prgm/project/hiphop/1.3.x/lib/hiphop.js                  */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal                                       */
/*    Creation    :  Mon Jul 16 11:23:59 2018                          */
/*    Last change :  Sat Dec  9 18:30:36 2023 (serrano)                */
/*    Copyright   :  2018-23 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    HipHop language definition                                       */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
export { version, CAUSALITY_JSON } from "./config.js";
export { ReactiveMachine } from "./machine.js";
export * from "./error.js";
export * from "./lang.js";
export { IN, OUT, INOUT } from "./ast.js";

/*---------------------------------------------------------------------*/
/*    language compiler (pre-processor)                                */
/*---------------------------------------------------------------------*/
import * as Parser from "../preprocessor/parser.js";

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

if (config.isServer) {
   Parser.setHHModulePath(import.meta.url);
   compiler.parser = Parser.parser;
   exports[Symbol.compiler] = compiler;
   exports[Symbol.script] = script;

   exports.eval = function(str) {
      return eval(Parser.parseString(`(function() {return ${str}})()`));
   }
}
