/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/hhc-compiler.mjs          */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Wed Oct 25 08:13:33 2023                          */
/*    Last change :  Sat Jul  6 09:35:27 2024 (serrano)                */
/*    Copyright   :  2023-24 manuel serrano                            */
/*    -------------------------------------------------------------    */
/*    HipHop compiler                                                  */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
import { generate, compileErrorHandler, list } from "@hop/hopc";
import { writeFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { dirname, join, basename } from "path";
import { parse, parseString } from "../preprocessor/parser.js";

export { ReactiveMachine } from "./machine.js";
export * from "./error.js";
export * from "./lang.js";
export { IN, OUT, INOUT } from "./ast.js";

export { compile, compileFile, compileFileSync };

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
   
   while (isString(list.car(nodes))) {
      prev = nodes;
      nodes = list.cdr(nodes);
   }

   if (prev) {
      list.setcdr(prev, list.cons(imp, list.cdr(prev)));
   } else {
      prog.nodes = list.cons(imp, prog.nodes);
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
	 const tag = "\n//# sourceMappingURL=" + target + ".map\n";

	 return writeFile(target, prgm + tag);
      }
   }

   outputSync(target) {
      const prgm = this.#fragment.toString();

      if (!target) {
	 console.log(prgm);
      } else {
	 const tag = "\n//# sourceMappingURL=" + target + ".map\n";

	 writeFileSync(target, prgm + tag);
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
   
   sourcemapSync(target) {
      const sm = {
	 version: 3,
	 file: target,
	 sources: [ this.#source ],
	 names: [],
	 mappings: this.#fragment.mappings(this.#source, target)
      }
      writeFileSync(target + ".map", JSON.stringify(sm));
   }
}

/*---------------------------------------------------------------------*/
/*    compile ...                                                      */
/*---------------------------------------------------------------------*/
function compile(source, conf = {}) {
   try {
      const prog = parse(source, conf, {});
      return new HHPrgm(source, generate(addHipHopImport(prog), conf));
   } catch(err) {
      compileErrorHandler(err);
   }
}

/*---------------------------------------------------------------------*/
/*    compileFile ...                                                  */
/*---------------------------------------------------------------------*/
async function compileFile(src, tgt = undefined) {
   if (!tgt) {
      tgt == join(dirname(src), "._" + src.replace(/[.]hh[.]/, "."));
   }

   const conf = src.match(/\.ts$/) ? { typescript: true } : {};
   const fragment = compile(src, conf);
   await fragment.output(tgt);
   await fragment.sourcemap(tgt);
   
   return new Promise((res, rej) => res(tgt));
}
   
/*---------------------------------------------------------------------*/
/*    compileFileSync ...                                              */
/*---------------------------------------------------------------------*/
function compileFileSync(src, tgt = undefined) {
   if (!tgt) {
      tgt = join(dirname(src), "._" + basename(src).replace(/[.]hh[.]/, "."));
   }

   const conf = src.match(/\.ts$/) ? { typescript: true } : {};
   const fragment = compile(src, conf);
   fragment.outputSync(tgt);
   fragment.sourcemapSync(tgt);
   
   return tgt;
}
   
