/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/hiphop.js                 */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal                                       */
/*    Creation    :  Mon Jul 16 11:23:59 2018                          */
/*    Last change :  Mon Dec 13 05:28:02 2021 (serrano)                */
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
export { batch } from "./batch.js";		       

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

compiler.parser = Parser.parser;

exports[ Symbol.compiler ] = compiler;

exports.eval = function(str) {
   return eval(Parser.parseString(`(function() {return ${str}})()`));
}
