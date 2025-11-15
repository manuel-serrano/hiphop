/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/shrink.mjs         */
/*    -------------------------------------------------------------    */
/*    Author      :  robby findler & manuel serrano                    */
/*    Creation    :  Tue May 27 17:31:35 2025                          */
/*    Last change :  Sat Nov 15 07:36:38 2025 (serrano)                */
/*    Copyright   :  2025 robby findler & manuel serrano               */
/*    -------------------------------------------------------------    */
/*    Program shrinker                                                 */
/*=====================================================================*/
import * as hh from "../lib/hiphop.js";
import * as hhapi from "../lib/ast.js";
import { jsonToHiphop } from "./dump.mjs";
import { parseExpr, exprToHiphop } from "./expr.mjs"

export { shrink };

const DEBUG = process.env.HIPHOP_RT_DEBUG === "true";
const MAX_SHRINK = 1000;

/*---------------------------------------------------------------------*/
/*    debug                                                            */
/*---------------------------------------------------------------------*/
let index = 0;
let stack = [undefined];
let margins = [""];

/*---------------------------------------------------------------------*/
/*    enter ...                                                        */
/*---------------------------------------------------------------------*/
function enter(n) {
   if (DEBUG) {
      const { heapUsed, heapTotal } = process.memoryUsage();

      if (index === stack.length) {
	 stack.push(n);
	 margins.push(margins[index - 1] + " ");
      } else {
	 stack[index] = n;
      }
      console.log(margins[index++], ">>>", n);
      
      if (heapUsed > heapTotal * 0.9) {
	 throw new Error("Heap exhausted!");
      }
   }
}

/*---------------------------------------------------------------------*/
/*    leave ...                                                        */
/*---------------------------------------------------------------------*/
function leave(value = undefined) {
   if (DEBUG) {
      index--;
      console.log(margins[index], "<<<", stack[index], value ? value.length : "");
   }

   if (value && value.length > MAX_SHRINK) {
      return value.slice(0, MAX_SHRINK);
   } else {
      return value;
   }
}
   
/*---------------------------------------------------------------------*/
/*    shrink ...                                                       */
/*---------------------------------------------------------------------*/
function shrink(prog) {
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
      let si = shrink(a[i])
      for (let j = 0; j < si.length; j++) {
	 ans.push(a.map((v, k) => (i === k) ? si[j] : v));
      }
   }
   
   return ans;
}

/*---------------------------------------------------------------------*/
/*    shrinkFunc ...                                                   */
/*---------------------------------------------------------------------*/
function shrinkFunc(func) {

   function equal(x, y) {
      if (x.kind === y.kind && x.prop === y.prop && x.value === y.value) {
	 return exprToHiphop(x) === exprToHiphop(y);
      } else {
	 return false;
      }
   }
   
   function newBinary(op, lhs, rhs) {
      if (equal(lhs, rhs)) {
	 return lhs;
      } else if (lhs.kind === "constant") {
	 if (lhs.value === "true") {
	    if (op === "||") {
	       return lhs;
	    } else {
	       return rhs;
	    }
	 } else if (lsh.value === "false") {
	    if (op === "||") {
	       return rhs;
	    } else {
	       return lhs;
	    }
	 }
      } else if (rhs.kind === "constant") {
	 return newBinary(op, rhs, lhs);
      } else {
	 return {
	    kind: "binary", op, lhs, rhs
	 }
      }
   }
	 
   function shrink(obj) {
      switch (obj.kind) {
	 case "constant":
	    return [];
	 case "sig":
	    return [{kind: "constant", value: "true"}];
	 case "unary": {
	    const xs = shrink(obj.expr);
	    
	    return [obj.expr]
	       .concat(xs.map(x => {
		  return {
		     kind: "unary",
		     op: obj.op,
		     expr: x }
	       }));
	 }
	 case "binary": {
	    const slhs = shrink(obj.lhs);
	    const srhs = shrink(obj.rhs);

	    return [obj.lhs, obj.rhs]
	       .concat(slhs.flatMap(l => srhs.map(r => newBinary(obj.op, l, r))));
/* 	       .concat(srhs.map(r => newBinary(obj.op, obj.lhs, r)))   */
/* 	       .concat(slhs.map(l => newBinary(obj.op, l, obj.rhs)));  */
	 }
	 default:
	    throw SyntaxError("Unsupported obj: " + obj.kind);
      }
   }

   function unique(arr) {
      return [...new Set(arr)];
   }
   
   enter(func.toString());
   const x = func.toString().replace(/^function[(][)][ ]* { return /, "").replace(/;[ ]*}$/, "");
   const xs = shrink(parseExpr(x));
   const fs = unique(xs.map(x => `(function() { return ${exprToHiphop(x)}; })`));

   return leave(fs.map(f => eval(f)));
}

//console.error(shrinkArray([1]));
//console.error(shrinkArray([1,2,3]), [[2,3],[1,3],[1,2],[0,2,3],[1,1,3],[1,2,2]]);

/*---------------------------------------------------------------------*/
/*    shrinkASTNode ...                                                */
/*---------------------------------------------------------------------*/
function shrinkASTNode(node, ctor, attr, children) {
   enter(node.constructor.name);
   
   if (children.length === 0) {
      return leave([hh.NOTHING({})]);
   } else if (children.length === 1) {
      return leave(shrink(children[0]).map(c => ctor(attr, c)).concat(children));
   } else {
      const el = shrinkArray(children);
      return leave(el.map(a => ctor(attr, a)));
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
   return shrinkASTNode(this, hh.SEQUENCE, {}, this.children);
}

/*---------------------------------------------------------------------*/
/*    shrink ::Fork ...                                                */
/*---------------------------------------------------------------------*/
hhapi.Fork.prototype.shrink = function() {
   return shrinkASTNode(this, hh.FORK, {}, this.children)
      .concat(hh.SEQUENCE({}, this.children));
}

/*---------------------------------------------------------------------*/
/*    shrink ::Loop ...                                                */
/*---------------------------------------------------------------------*/
hhapi.Loop.prototype.shrink = function() {
   return shrinkASTNode(this, hh.LOOP, {}, this.children)
      .concat(hh.SEQUENCE({}, this.children));
}

/*---------------------------------------------------------------------*/
/*    shrink ::Trap ...                                                */
/*---------------------------------------------------------------------*/
hhapi.Trap.prototype.shrink = function() {
   enter(this.constructor.name);
   
   const children = this.children;
   const attr = {[this.trapName]: this.trapName};

   if (children.length === 0) {
      return leave([hh.NOTHING({})]);
   } else if (children.length === 1) {
      return leave(shrink(children[0]).map(c => hh.TRAP(attr, c)));
   } else {
      const el = shrinkArray(children);
      return leave(el.map(a => hh.TRAP(attr, a)));
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
   enter(this.constructor.name);
   
   const children = this.children;
   const attrs = {};
   this.sigDeclList.forEach(p => attrs[p.name] = { signal: p.name, name: p.name, accessibility: hh.INOUT }, true);
   
   if (children.length === 0) {
      return leave([hh.NOTHING({})]);
   } else if (children.length === 1) {
      return leave(shrink(children[0]).map(c => hh.LOCAL(attrs, c)));
   } else {
      const el = shrinkArray(children);
      return leave(el.map(a => hh.LOCAL(attrs, a)));
   }
}

/*---------------------------------------------------------------------*/
/*    shrink ::If ...                                                  */
/*---------------------------------------------------------------------*/
hhapi.If.prototype.shrink = function() {
   enter(this.constructor.name);
   
   const [ child0, child1 ] = this.children;
   const c0 = shrink(child0);
   const c1 = shrink(child1);
   const res = [child0, child1];
   const funcs = shrinkFunc(this.func);

   enter(`-- ${this.constructor.name} (${child0.constructor.name}:${c0.length}) (${child1.constructor.name}:${c1.length}) ${funcs.length}`);
   for (let i = 0; i < c0.length; i++) {
      for (let j = 0; j < c1.length; j++) {
	 res.push(hh.IF({apply: this.func}, c0[i], c1[j]));
	 funcs.forEach(f => res.push(hh.IF({apply: f}, c0[i], c1[j])));
      }
   }
   leave(undefined);

   return leave(res
      .concat(funcs.map(f => hh.IF({apply: f}, child0, child1)))
      .concat(c0, c1));
}

/*---------------------------------------------------------------------*/
/*    shrink ::Abort ...                                               */
/*---------------------------------------------------------------------*/
hhapi.Abort.prototype.shrink = function() {
   enter(this.constructor.name);
   
   const child0 = this.children[0];
   const c0 = shrink(child0);
   const res = [child0];
   const funcs = shrinkFunc(this.func);

   enter(`-- ${this.constructor.name} (${child0.constructor.name}:${c0.length}) ${funcs.length}`);
   c0.forEach(c => {
      res.push(hh.ABORT({apply: this.func}, c));
      funcs.forEach(f => res.push(hh.ABORT({apply: f}, c)));
   });
   leave(undefined);

   return leave(res
      .concat(funcs.map(f => hh.ABORT({apply: f}, child0)))
      .concat(c0));
}

/*---------------------------------------------------------------------*/
/*    shrink ::Every ...                                               */
/*---------------------------------------------------------------------*/
hhapi.Every.prototype.shrink = function() {
   enter(this.constructor.name);
   
   const child0 = this.children[0];
   const c0 = shrink(child0);
   const res = [child0];
   const funcs = shrinkFunc(this.func);

   enter(`-- ${this.constructor.name} (${child0.constructor.name}:${c0.length}) ${funcs.length}`);
   c0.forEach(c => {
      res.push(hh.EVERY({apply: this.func}, c));
      funcs.forEach(f => res.push(hh.EVERY({apply: f}, c)));
   });
   leave();

   return leave(res
      .concat(funcs.map(f => hh.EVERY({apply: f}, child0)))
      .concat(c0));
}

/*---------------------------------------------------------------------*/
/*    shrink ::LoopEach ...                                            */
/*---------------------------------------------------------------------*/
hhapi.LoopEach.prototype.shrink = function() {
   enter(this.constructor.name);
   
   const child0 = this.children[0];
   const c0 = shrink(child0);
   const res = [child0];
   const funcs = shrinkFunc(this.func);

   enter(`-- ${this.constructor.name} (${child0.constructor.name}:${c0.length}) ${funcs.length}`);
   c0.forEach(c => {
      res.push(hh.LOOPEACH({apply: this.func}, c));
      funcs.forEach(f => res.push(hh.LOOPEACH({apply: f}, c)));
   });
   leave();

   return leave(res
      .concat(funcs.map(f => hh.LOOPEACH({apply: f}, child0)))
      .concat(c0));
}

/*---------------------------------------------------------------------*/
/*    shrink ::Atom ...                                                */
/*---------------------------------------------------------------------*/
hhapi.Atom.prototype.shrink = function() {
   enter(this.constructor.name);
   const funcs = shrinkFunc(this.func);
   return leave([hh.NOTHING({})].concat(funcs.map(f => hh.ATOM({apply: f}))));
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

