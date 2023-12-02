/*=====================================================================*/
/*    serrano/prgm/project/hiphop/1.3.x/lib/hhc-compiler.mjs           */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Wed Oct 25 08:13:33 2023                          */
/*    Last change :  Fri Dec  1 07:56:32 2023 (serrano)                */
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
import { generate, $ioParseError } from "@hop/hopc";
import { writeFile } from 'node:fs/promises';
import { dirname } from "path";

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
/*    HHPrgm ...                                                       */
/*---------------------------------------------------------------------*/
class HHPrgm {
   #source = false;
   #fragment = undefined;
   
   constructor(source, fragment) {
      this.#source = source;
      this.#fragment = fragment;
   }

   output(target) {
      const prgm = this.#fragment.toString();

      if (!target) {
	 return new Promise((res, rej) => { console.log(prgm); res(true) });
      } else {
	 const tag = `\n//# sourceMappingURL=${target}.map\n`;

	 return writeFile(target, prgm + tag);
      }
   }

   sourcemap(target) {
      const sm = {
	 version: 3,
	 file: target,
	 sources: [ this.#source ],
	 names: [],
	 mappings: this.#fragment.mappings(this.#source, target)
      }
      return writeFile(target + ".map", JSON.stringify(sm));
   }
}

/*---------------------------------------------------------------------*/
/*    compileHandler ...                                               */
/*---------------------------------------------------------------------*/
function compileHandler(err) {
   if (err && err.obj && err.obj.loc?.filename) {
      $ioParseError({
	 "fname": err.obj.loc.filename,
	 "location": err.obj.loc?.offset ?? -1,
	 "msg": "parse error",
	 "message": err.msg + "\n",
	 forceexit: true
      });
      throw "syntax error.";
   } else if (err && err?.fname && err?.location) {
      $ioParseError({
	 "fname": err.fname,
	 "location": err.location,
	 "msg": "parse error",
	 "message": err.msg + "\n",
	 forceexit: true
      });
      throw "syntax error.";
   } else if (err && err?.location) {
      $ioParseError({
	 "fname": err.location.filename,
	 "location": err.location.pos,
	 "msg": "parse error",
	 "message": err.msg + "\n",
	 forceexit: true
      });
      throw "syntax error.";
   } else {
      throw err;
   }
}
      
/*---------------------------------------------------------------------*/
/*    compile ...                                                      */
/*---------------------------------------------------------------------*/
export function compile(source) {
   try {
      const prog = parse(source, {}, {});
      return new HHPrgm(source, generate(addHipHopImport(prog)));
   } catch(err) {
      compileHandler(err);
   }
}
