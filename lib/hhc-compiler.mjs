/*=====================================================================*/
/*    serrano/prgm/project/hiphop/1.3.x/lib/hhc-compiler.mjs           */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Wed Oct 25 08:13:33 2023                          */
/*    Last change :  Thu Nov 23 13:25:06 2023 (serrano)                */
/*    Copyright   :  2023 manuel serrano                               */
/*    -------------------------------------------------------------    */
/*    HipHop compiler                                                  */
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
export { $ioParseError } from "@hop/hopc";
import { generate } from "@hop/hopc";

/*---------------------------------------------------------------------*/
/*    language compiler (pre-processor)                                */
/*---------------------------------------------------------------------*/
import { parse, parseString } from "../preprocessor/parser.js";

/*---------------------------------------------------------------------*/
/*    isString ...                                                     */
/*---------------------------------------------------------------------*/
function isString(node) {
   if (node.clazz === "J2SStmtExpr") {
      const expr = node.expr;
      return expr.clazz === "J2SString";
   } else {
      return false;
   }
}

/*---------------------------------------------------------------------*/
/*    addHipHopImport ...                                              */
/*---------------------------------------------------------------------*/
function addHipHopImport(prog) {
   let nodes = prog.nodes;
   let prev = null;
   const imp = parseString("import * as $$hiphop from \"@hop/hiphop\"");
   
   while (isString(nodes.car)) {
      prev = nodes;
      nodes = nodes.cdr;
   }

   if (prev) {
      prev.cdr = { car: imp, cdr: prev.cdr }
   } else {
      prog.nodes = { car: imp, cdr: prog.nodes }
   }
   
   return prog;
}

/*---------------------------------------------------------------------*/
/*    compile ...                                                      */
/*---------------------------------------------------------------------*/
export function compile(source) {
   const prog = parse(source, {}, {});
   return generate(addHipHopImport(prog));
}
