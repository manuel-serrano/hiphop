/*=====================================================================*/
/*    serrano/prgm/project/hiphop/1.3.x/lib/hiphop.js                  */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal                                       */
/*    Creation    :  Mon Jul 16 11:23:59 2018                          */
/*    Last change :  Mon Jan 29 21:39:07 2024 (serrano)                */
/*    Copyright   :  2018-24 Manuel Serrano                            */
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
export { compileString };

import * as Parser from "../preprocessor/parser.js";

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

function compileString(str) {
   const ast = Parser.parseString(`(() => {return ${str}})()\n`);
   return ast.generate().toString();
}
   
if (isServer && process.versions.hop) {
   Parser.setHHModulePath(import.meta.url);
   compiler.parser = Parser.parser;
   exports[Symbol.compiler] = compiler;
   exports[Symbol.script] = script;

   exports.compileString = compileString;
}
