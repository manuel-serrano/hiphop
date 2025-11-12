/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/shrink.mjs         */
/*    -------------------------------------------------------------    */
/*    Author      :  robby findler & manuel serrano                    */
/*    Creation    :  Tue May 27 17:31:35 2025                          */
/*    Last change :  Wed Nov 12 08:45:57 2025 (serrano)                */
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
      return [hh.NOTHING({})];
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
	 const attrs = {};
	 this.sigDeclList.forEach(sig => attrs[sig.name] = { signal: sig.name, name: sig.name, accessibility: hh.INOUT, combine: (x, y) => x });
	 return [hh.MODULE(attrs, a)];
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
   return shrinkASTNode(hh.FORK, {}, this.children)
      .concat(hh.SEQUENCE({}, this.children));
}

/*---------------------------------------------------------------------*/
/*    shrink ::Loop ...                                                */
/*---------------------------------------------------------------------*/
hhapi.Loop.prototype.shrink = function() {
   return shrinkASTNode(hh.LOOP, {}, this.children)
      .concat(hh.SEQUENCE({}, this.children));
}

/*---------------------------------------------------------------------*/
/*    shrink ::Trap ...                                                */
/*---------------------------------------------------------------------*/
hhapi.Trap.prototype.shrink = function() {
   const children = this.children;
   const attr = {[this.trapName]: this.trapName};

   if (children.length === 0) {
      return [hh.NOTHING({})];
   } else if (children.length === 1) {
      return shrinker(children[0]).map(c => hh.TRAP(attr, c));
   } else {
      const el = shrinkArray(children);
      return el.map(a => hh.TRAP(attr, a));
   }
}

/*---------------------------------------------------------------------*/
/*    shrink ::Exit ...                                                */
/*---------------------------------------------------------------------*/
hhapi.Exit.prototype.shrink = function() {
   return [hh.PAUSE({})];
}

/*---------------------------------------------------------------------*/
/*    shrink ::Halt ...                                                */
/*---------------------------------------------------------------------*/
hhapi.Halt.prototype.shrink = function() {
   return [hh.PAUSE({})];
}

/*---------------------------------------------------------------------*/
/*    shrink ::Emit ...                                                */
/*---------------------------------------------------------------------*/
hhapi.Emit.prototype.shrink = function() {
   return [hh.NOTHING({})];
}

/*---------------------------------------------------------------------*/
/*    shrink ::Local ...                                               */
/*---------------------------------------------------------------------*/
hhapi.Local.prototype.shrink = function() {
   const children = this.children;
   const attrs = {};
   this.sigDeclList.forEach(p => attrs[p.name] = { signal: p.name, name: p.name, accessibility: hh.INOUT }, true);
   
   if (children.length === 0) {
      return [hh.NOTHING({})];
   } else if (children.length === 1) {
      return shrinker(children[0]).map(c => hh.LOCAL(attrs, c));
   } else {
      const el = shrinkArray(children);
      return el.map(a => hh.LOCAL(attrs, a));
   }
}

/*---------------------------------------------------------------------*/
/*    shrink ::If ...                                                  */
/*---------------------------------------------------------------------*/
hhapi.If.prototype.shrink = function() {
   const [ child0, child1 ] = this.children;
   const c0 = shrinker(child0);
   const c1 = shrinker(child1);
   const res = [];

   for (let i = 0; i < c0.length; i++) {
      for (let j = 0; j < c1.length; j++) {
	 res.push(hh.IF({apply: this.func}, c0[i], c1[j]));
      }
   }

   return res.concat(c0, c1);
}

/*---------------------------------------------------------------------*/
/*    shrink ::Abort ...                                               */
/*---------------------------------------------------------------------*/
hhapi.Abort.prototype.shrink = function() {
   const child0 = this.children[0];
   const c0 = shrinker(child0);
   const res = [];

   c0.forEach(c => res.push(hh.ABORT({apply: this.func}, c)));

   return res.concat(c0);
}

/*---------------------------------------------------------------------*/
/*    shrink ::Every ...                                               */
/*---------------------------------------------------------------------*/
hhapi.Every.prototype.shrink = function() {
   const child0 = this.children[0];
   const c0 = shrinker(child0);
   const res = [];

   c0.forEach(c => res.push(hh.EVERY({apply: this.func}, c)));

   return res.concat(c0);
}

/*---------------------------------------------------------------------*/
/*    shrink ::LoopEach ...                                            */
/*---------------------------------------------------------------------*/
hhapi.LoopEach.prototype.shrink = function() {
   const child0 = this.children[0];
   const c0 = shrinker(child0);
   const res = [];

   c0.forEach(c => res.push(hh.LOOPEACH({apply: this.func}, c)));

   return res.concat(c0);
}

/*---------------------------------------------------------------------*/
/*    shrink ::Atom ...                                                */
/*---------------------------------------------------------------------*/
hhapi.Atom.prototype.shrink = function() {
   return [hh.NOTHING({})];
}

/*---------------------------------------------------------------------*/
/*    shrink ::Await ...                                               */
/*---------------------------------------------------------------------*/
hhapi.Await.prototype.shrink = function() {
   return [hh.PAUSE({})];
}

/*---------------------------------------------------------------------*/
/*    shrink ::Sync ...                                                */
/*---------------------------------------------------------------------*/
hhapi.Sync.prototype.shrink = function() {
   return [];
}

