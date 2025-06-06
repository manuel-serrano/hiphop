/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/shrink.mjs         */
/*    -------------------------------------------------------------    */
/*    Author      :  robby findler & manuel serrano                    */
/*    Creation    :  Tue May 27 17:31:35 2025                          */
/*    Last change :  Fri Jun  6 08:44:51 2025 (serrano)                */
/*    Copyright   :  2025 robby findler & manuel serrano               */
/*    -------------------------------------------------------------    */
/*    Program shrinker                                                 */
/*=====================================================================*/
import * as hh from "../lib/hiphop.js";
import * as hhapi from "../lib/ast.js";
import { jsonToHiphop } from "./dump.mjs";

export { shrinker };

/*---------------------------------------------------------------------*/
/*    shrinker ...                                                     */
/*---------------------------------------------------------------------*/
function shrinker(prog) {
   if (typeof prog === "number" && Number.isInteger(prog)) {
      return shrinkInt(prog);
   } else if (prog instanceof Array) {
      return shrinkArray(prog);
   } else if (prog instanceof hhapi.$ASTNode) {
      return prog.shrink();
   } else {
      throw new Error("cannot shrink " + prog.constructor.name);
   }
}

/*---------------------------------------------------------------------*/
/*    shrinkInt ...                                                    */
/*---------------------------------------------------------------------*/
function shrinkInt(i) {
   if (i === 0) return [];
   if (i < 0) return [-i, i+1];
   return [i-1];
}

/*---------------------------------------------------------------------*/
/*    shrinkArray ...                                                  */
/*---------------------------------------------------------------------*/
function shrinkArray(a) {
   let ans = [];
   
   for (let i = 0; i < a.length; i++) {
      ans.push(a.slice(0, i).concat(a.slice(i + 1, a.length)));
   }
   for (let i = 0; i < a.length; i++) {
      let si = shrinker(a[i])
      for (let j = 0; j < si.length; j++) {
	 ans.push(a.map((v, k) => (i === k) ? si[j] : v));
      }
   }
   
   return ans;
}

//console.error(shrinkArray([1]));
//console.error(shrinkArray([1,2,3]), [[2,3],[1,3],[1,2],[0,2,3],[1,1,3],[1,2,2]]);

/*---------------------------------------------------------------------*/
/*    shrinkASTNode ...                                                */
/*---------------------------------------------------------------------*/
function shrinkASTNode(ctor, attr, children) {
   if (children.length === 0) {
      return [ hh.NOTHING({}) ];
   } else if (children.length === 1) {
      return shrinker(children[0]).map(c => ctor(attr, c)).concat(children);
   } else {
      const el = shrinkArray(children);
      return el.map(a => ctor(attr, a));
   }
}

/*---------------------------------------------------------------------*/
/*    shrink ::$ASTNode ...                                            */
/*---------------------------------------------------------------------*/
hhapi.$ASTNode.prototype.shrink = function() {
   throw new Error(`shrink not implemented for "${this.constructor.name}"`);
}

/*---------------------------------------------------------------------*/
/*    shrink ::Module ...                                              */
/*---------------------------------------------------------------------*/
hhapi.Module.prototype.shrink = function() {
   const el = shrinkArray(this.children);
   return el.flatMap(a => {
      if (a.length === 0) {
	 return [];
      } else {
	 return [ hh.MODULE({}, a) ];
      }
   });
}

/*---------------------------------------------------------------------*/
/*    shrink ::Nothing ...                                             */
/*---------------------------------------------------------------------*/
hhapi.Nothing.prototype.shrink = function() {
   return [];
}

/*---------------------------------------------------------------------*/
/*    shrink ::Pause ...                                               */
/*---------------------------------------------------------------------*/
hhapi.Pause.prototype.shrink = function() {
   return [hh.NOTHING({})];
}

/*---------------------------------------------------------------------*/
/*    shrink ::Sequence ...                                            */
/*---------------------------------------------------------------------*/
hhapi.Sequence.prototype.shrink = function() {
   return shrinkASTNode(hh.SEQUENCE, {}, this.children);
}

/*---------------------------------------------------------------------*/
/*    shrink ::Fork ...                                                */
/*---------------------------------------------------------------------*/
hhapi.Fork.prototype.shrink = function() {
   return shrinkASTNode(hh.FORK, {}, this.children);
}

/*---------------------------------------------------------------------*/
/*    shrink ::Loop ...                                                */
/*---------------------------------------------------------------------*/
hhapi.Loop.prototype.shrink = function() {
   return shrinkASTNode(hh.LOOP, {}, this.children);
}

/*---------------------------------------------------------------------*/
/*    shrink ::Trap ...                                                */
/*---------------------------------------------------------------------*/
hhapi.Trap.prototype.shrink = function() {
   const attrs = { [this.trapName]: this.traName };
   return shrinkASTNode(hh.TRAP, attrs, this.children);
}

/*---------------------------------------------------------------------*/
/*    shrink ::Exit ...                                                */
/*---------------------------------------------------------------------*/
hhapi.Exit.prototype.shrink = function() {
   return [hh.PAUSE({})];
}

