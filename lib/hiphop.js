/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/hiphop.js                 */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal                                       */
/*    Creation    :  Mon Jul 16 11:23:59 2018                          */
/*    Last change :  Sat Dec 25 10:48:53 2021 (serrano)                */
/*    Copyright   :  2018-21 Manuel Serrano                            */
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
const Parser = hop.isServer && hop.engine === "hop"
   ? require("../preprocessor/parser", "hopscript")
   : { parse: function(_, conf) { }, parseString : function(_, conf) { }  };

function compiler(ifile, conf) {
   return {
      type: "ast",
      value: Parser.parse(ifile, conf)
   }
}

if (hop.isServer) {
   Parser.setRootDirectory(import.meta.url);
   compiler.parser = Parser.parser;

   exports[ Symbol.compiler ] = compiler;

   exports.eval = function(str) {
      return eval(Parser.parseString(`(function() {return ${str}})()`));
   }
}
