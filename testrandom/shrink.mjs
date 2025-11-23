/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/shrink.mjs         */
/*    -------------------------------------------------------------    */
/*    Author      :  robby findler & manuel serrano                    */
/*    Creation    :  Tue May 27 17:31:35 2025                          */
/*    Last change :  Sun Nov 23 06:07:33 2025 (serrano)                */
/*    Copyright   :  2025 robby findler & manuel serrano               */
/*    -------------------------------------------------------------    */
/*    Program shrinker                                                 */
/*=====================================================================*/
import * as hh from "../lib/hiphop.js";
import * as hhapi from "../lib/ast.js";
import { jsonToHiphop } from "./json.mjs";
import { parseExpr, exprToHiphop, exprEqual, newBinary } from "./expr.mjs"

export { shrink };

const DEBUG = process.env.HIPHOP_RT_DEBUG === "true";
const SHRINK_LIMIT = 256;

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
function leave(value, limit = SHRINK_LIMIT) {
   if (DEBUG) {
      index--;
      console.log(margins[index], "<<<", stack[index], value ? value.length : "");
   }

   if (value && value.length > limit) {
      return value.slice(0, limit);
   } else {
      return value;
   }
}
   
/*---------------------------------------------------------------------*/
/*    shrink ...                                                       */
/*---------------------------------------------------------------------*/
function shrink({prog, events, filters}) {
   try {
      const progs = shrinkProg(prog);

      if (progs.length === 0) {
	 if (events.length === 1) {
	    return [];
	 } else {
	    let sevents = [];
	    for (let i = 0; i < events.length; i++) {
	       const evt = events.slice(i - 1, i)
		  .concat(events.slice(i + 1, events.length));
	       sevents.push(evt);
	    }
	    return sevents.map(events => { return { prog, events, filters } });
	 }
      } else {
	 const sprogs = shrinkSignals(prog.sigDeclList, prog.children, hh.MODULE)
	    .map(mod => {
	       const signames = mod.sigDeclList.map(s => s.name);
	       const nevents = events.map(e => {
		  if (!e) {
		     return e;
		  } else {
		     const ne = {};
		     signames.forEach(n => {
			if (n in e) {
			   ne[n] = e[n];
			}
		     });
		     return ne;
		  }
	       });
	       return { prog: mod, events: nevents, filters };
	    });

	 return progs.map(prog => { return { prog, events, filters } })
	    .concat(sprogs);
      }
      
   } catch(e) {
      console.error("CANNOT SHRINK...");
      console.error(e.toString());
      throw e;
   }
}

/*---------------------------------------------------------------------*/
/*    shrinkProg ...                                                   */
/*---------------------------------------------------------------------*/
function shrinkProg(prog) {
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
      let si = shrinkProg(a[i])
      for (let j = 0; j < si.length; j++) {
	 ans.push(a.map((v, k) => (i === k) ? si[j] : v));
      }
   }
   
   return ans;
}

//console.error(shrinkArray([1]), "vs", [[],[0]]);
//console.error(shrinkArray([1,2,3]), "vs", [[2,3],[1,3],[1,2],[0,2,3],[1,1,3],[1,2,2]]);

/*---------------------------------------------------------------------*/
/*    shrinkSignalFunc ...                                             */
/*---------------------------------------------------------------------*/
function shrinkSignalFunc(func, sig) {

   function shrink(obj) {
      switch (obj.kind) {
	 case "constant":
	    return obj;
	 case "sig":
	    if (obj.value === sig) {
	       return {kind: "constant", value: "false"};
	    } else {
	       return obj;
	    }
	 case "unary": {
	    const xs = shrink(obj.expr);

	    if (xs.kind === "constant") {
	       return {
		  kind: "constant",
		  value: (xs.value === "true") ? "false" : "true"
	       }
	    } else {
	       return xs;
	    }
	 }
	 case "binary": {
	    return newBinary(obj.op, shrink(obj.lhs), shrink(obj.rhs));
	 }

	 default:
	    throw SyntaxError("Unsupported obj: " + obj.kind);
      }
   }

   const x = func.toString().replace(/^function[(][)][ ]* { return /, "").replace(/;[ ]*}$/, "");
   const f = shrink(parseExpr(x));

   return eval(`(function() { return ${exprToHiphop(f)}; })`);
}

//console.error(shrinkSignalFunc(function() { return (this.xxx.now || (this.yyy.pre || this.xxx.now)) }, "xxx").toString());

/*---------------------------------------------------------------------*/
/*    shrinkSignals ...                                                */
/*    -------------------------------------------------------------    */
/*    Remove one signal at a time.                                     */
/*---------------------------------------------------------------------*/
function shrinkSignals(decl, children, ctor, accessibility) {
   if (decl.length === 0) {
      return [];
   } else {
      const res = [];
      
      decl.forEach((d, i) => {
	 const attrs = {};
	 decl.forEach((s, j) => {
	    if (i !== j) {
	       attrs[s.name] = {
		  signal: s.name,
		  name: s.name,
		  accessibility: hh.INOUT,
		  combine: (x, y) => (x + y)
	       }
	    }
	 });

	 res.push(ctor(attrs, ...children.map(c => c.shrinkSignal(d.name))));
      });
      
      return res;
   }
}

/*---------------------------------------------------------------------*/
/*    shrinkSignalASTNode ...                                          */
/*---------------------------------------------------------------------*/
function shrinkSignalASTNode(node, ctor, attr, sig) {
   return ctor(attr, ...node.children.map(c => c.shrinkSignal(sig)));
}

/*---------------------------------------------------------------------*/
/*    shrinkSignal ::$ASTNode ...                                      */
/*---------------------------------------------------------------------*/
hhapi.$ASTNode.prototype.shrinkSignal = function(sig) {
   return this;
}

/*---------------------------------------------------------------------*/
/*    shrinkSignal ::Sequence ...                                      */
/*---------------------------------------------------------------------*/
hhapi.Sequence.prototype.shrinkSignal = function(sig) {
   return shrinkSignalASTNode(this, hh.SEQUENCE, {}, sig);
}

/*---------------------------------------------------------------------*/
/*    shrinkSignal ::Fork ...                                          */
/*---------------------------------------------------------------------*/
hhapi.Fork.prototype.shrinkSignal = function(sig) {
   return shrinkSignalASTNode(this, hh.FORK, {}, sig);
}

/*---------------------------------------------------------------------*/
/*    shrinkSignal ::Loop ...                                          */
/*---------------------------------------------------------------------*/
hhapi.Loop.prototype.shrinkSignal = function(sig) {
   return shrinkSignalASTNode(this, hh.LOOP, {}, sig);
}

/*---------------------------------------------------------------------*/
/*    shrinkSignal ::Trap ...                                          */
/*---------------------------------------------------------------------*/
hhapi.Trap.prototype.shrinkSignal = function(sig) {
   const attrs = { [this.trapName]: this.trapName };
   return shrinkSignalASTNode(this, hh.TRAP, attrs, sig);
}

/*---------------------------------------------------------------------*/
/*    shrinkSignal ::Emit ...                                          */
/*---------------------------------------------------------------------*/
hhapi.Emit.prototype.shrinkSignal = function(sig) {
   if (this.signame_list[0] === sig) {
      return hh.NOTHING({});
   } else {
      return this;
   }
}

/*---------------------------------------------------------------------*/
/*    shrinkSignal ::Local ...                                         */
/*---------------------------------------------------------------------*/
hhapi.Local.prototype.shrinkSignal = function(sig) {
   const attrs = {};
   this.sigDeclList.forEach(p => attrs[p.name] = { signal: p.name, name: p.name, combine: (x, y) => (x + y) }, true);
   return shrinkSignalASTNode(this, hh.LOCAL, attrs, sig);
}

/*---------------------------------------------------------------------*/
/*    shrinkSignal ::If ...                                            */
/*---------------------------------------------------------------------*/
hhapi.If.prototype.shrinkSignal = function(sig) {
   const attrs = {apply: shrinkSignalFunc(this.func, sig)};
   return shrinkSignalASTNode(this, hh.IF, attrs, sig);
}

/*---------------------------------------------------------------------*/
/*    shrinkSignal ::Abort ...                                         */
/*---------------------------------------------------------------------*/
hhapi.Abort.prototype.shrinkSignal = function(sig) {
   const attrs = {apply: shrinkSignalFunc(this.func, sig)};
   return shrinkSignalASTNode(this, hh.ABORT, attrs, sig);
}

/*---------------------------------------------------------------------*/
/*    shrinkSignal ::Every ...                                         */
/*---------------------------------------------------------------------*/
hhapi.Every.prototype.shrinkSignal = function(sig) {
   const attrs = {apply: shrinkSignalFunc(this.func, sig)};
   return shrinkSignalASTNode(this, hh.EVERY, attrs, sig);
}

/*---------------------------------------------------------------------*/
/*    shrinkSignal ::LoopEach ...                                      */
/*---------------------------------------------------------------------*/
hhapi.LoopEach.prototype.shrinkSignal = function(sig) {
   const attrs = {apply: shrinkSignalFunc(this.func, sig)};
   return shrinkSignalASTNode(this, hh.LOOPEACH, attrs, sig);
}

/*---------------------------------------------------------------------*/
/*    shrinkSignal ::Await ...                                         */
/*---------------------------------------------------------------------*/
hhapi.Await.prototype.shrinkSignal = function(sig) {
   const attrs = {apply: shrinkSignalFunc(this.func, sig)};
   return hh.AWAIT(attrs);
}

/*---------------------------------------------------------------------*/
/*    shrinkSignal ::Atom ...                                          */
/*---------------------------------------------------------------------*/
hhapi.Atom.prototype.shrinkSignal = function(sig) {
   const attrs = {apply: shrinkSignalFunc(this.func, sig)};
   return hh.ATOM(attrs);
}

/*---------------------------------------------------------------------*/
/*    shrinkTrapASTNode ...                                            */
/*---------------------------------------------------------------------*/
function shrinkTrapASTNode(node, ctor, attr, trap) {
   return ctor(attr, ...node.children.map(c => c.shrinkTrap(trap)));
}

/*---------------------------------------------------------------------*/
/*    shrinkTrap ::$ASTNode ...                                        */
/*---------------------------------------------------------------------*/
hhapi.$ASTNode.prototype.shrinkTrap = function(trap) {
   return this;
}

/*---------------------------------------------------------------------*/
/*    shrinkTrap ::Sequence ...                                        */
/*---------------------------------------------------------------------*/
hhapi.Sequence.prototype.shrinkTrap = function(trap) {
   return shrinkTrapASTNode(this, hh.SEQUENCE, {}, trap);
}

/*---------------------------------------------------------------------*/
/*    shrinkTrap ::Fork ...                                            */
/*---------------------------------------------------------------------*/
hhapi.Fork.prototype.shrinkTrap = function(trap) {
   return shrinkTrapASTNode(this, hh.FORK, {}, trap);
}

/*---------------------------------------------------------------------*/
/*    shrinkTrap ::Loop ...                                            */
/*---------------------------------------------------------------------*/
hhapi.Loop.prototype.shrinkTrap = function(trap) {
   return shrinkTrapASTNode(this, hh.LOOP, {}, trap);
}

/*---------------------------------------------------------------------*/
/*    shrinkTrap ::Trap ...                                            */
/*---------------------------------------------------------------------*/
hhapi.Trap.prototype.shrinkTrap = function(trap) {
   const attrs = { [this.trapName]: this.trapName };
   return shrinkTrapASTNode(this, hh.TRAP, attrs, trap);
}

/*---------------------------------------------------------------------*/
/*    shrinkTrap ::Exit ...                                            */
/*---------------------------------------------------------------------*/
hhapi.Exit.prototype.shrinkTrap = function(trap) {
   if (this.trapName === trap) {
      return hh.NOTHING({});
   } else {
      return this;
   }
}

/*---------------------------------------------------------------------*/
/*    shrinkTrap ::Local ...                                           */
/*---------------------------------------------------------------------*/
hhapi.Local.prototype.shrinkTrap = function(trap) {
   const attrs = {};
   this.sigDeclList.forEach(p => attrs[p.name] = { signal: p.name, name: p.name, combine: (x, y) => (x + y) }, true);
   return shrinkTrapASTNode(this, hh.LOCAL, attrs, trap);
}

/*---------------------------------------------------------------------*/
/*    shrinkTrap ::If ...                                              */
/*---------------------------------------------------------------------*/
hhapi.If.prototype.shrinkTrap = function(trap) {
   const attrs = {apply: this.func};
   return shrinkTrapASTNode(this, hh.IF, attrs, trap);
}

/*---------------------------------------------------------------------*/
/*    shrinkTrap ::Abort ...                                           */
/*---------------------------------------------------------------------*/
hhapi.Abort.prototype.shrinkTrap = function(trap) {
   const attrs = {apply: this.func};
   return shrinkTrapASTNode(this, hh.ABORT, attrs, trap);
}

/*---------------------------------------------------------------------*/
/*    shrinkTrap ::Every ...                                           */
/*---------------------------------------------------------------------*/
hhapi.Every.prototype.shrinkTrap = function(trap) {
   const attrs = {apply: this.func};
   return shrinkTrapASTNode(this, hh.EVERY, attrs, trap);
}

/*---------------------------------------------------------------------*/
/*    shrinkTrap ::LoopEach ...                                        */
/*---------------------------------------------------------------------*/
hhapi.LoopEach.prototype.shrinkTrap = function(trap) {
   const attrs = {apply: this.func};
   return shrinkTrapASTNode(this, hh.LOOPEACH, attrs, trap);
}

/*---------------------------------------------------------------------*/
/*    shrinkFunc ...                                                   */
/*---------------------------------------------------------------------*/
function shrinkFunc(func) {

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
	       .concat(slhs.map(l => newBinary(obj.op, l, obj.rhs)))
	       .concat(srhs.map(r => newBinary(obj.op, obj.lhs, r)));
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

   return leave(fs.map(f => eval(f)), 32);
}

/*---------------------------------------------------------------------*/
/*    shrinkASTNode ...                                                */
/*---------------------------------------------------------------------*/
function shrinkASTNode(node, ctor, attr, children) {
   enter(node.constructor.name);
   
   if (children.length === 0) {
      return leave([hh.NOTHING({})]);
   } else if (children.length === 1) {
      return leave(shrinkProg(children[0]).map(c => ctor(attr, c)).concat(children));
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
	 this.sigDeclList.forEach(sig => attrs[sig.name] = { signal: sig.name, name: sig.name, accessibility: hh.INOUT, combine: (x, y) => (x + y) });
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
   return [hh.SEQUENCE({}, this.children)]
      .concat(...shrinkASTNode(this, hh.FORK, {}, this.children));
}

/*---------------------------------------------------------------------*/
/*    shrink ::Loop ...                                                */
/*---------------------------------------------------------------------*/
hhapi.Loop.prototype.shrink = function() {
   return [hh.SEQUENCE({}, this.children)]
      .concat(...shrinkASTNode(this, hh.LOOP, {}, this.children));
}

/*---------------------------------------------------------------------*/
/*    shrink ::Trap ...                                                */
/*---------------------------------------------------------------------*/
hhapi.Trap.prototype.shrink = function() {
   enter(this.constructor.name);
   
   const children = this.children;
   const attr = {[this.trapName]: this.trapName};
   const res = [children[0].shrinkTrap(this.trapName)];

   if (children.length === 0) {
      return leave(res);
   } else if (children.length === 1) {
      return leave(res
	 .concat(shrinkProg(children[0]).map(c => hh.TRAP(attr, c))));
   } else {
      const el = shrinkArray(children);
      return leave(res.concat(el.map(a => hh.TRAP(attr, a))));
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

   if (this.sigDeclList.length === 0) {
      return children;
   } else {
      const attrs = {};
      this.sigDeclList.forEach(p => attrs[p.name] = { signal: p.name, name: p.name, accessibility: hh.INOUT }, true);
      
      if (children.length === 0) {
	 return leave([hh.NOTHING({})]);
      } else if (children.length === 1) {
	 const slocal = shrinkSignals(this.sigDeclList, children, hh.LOCAL);
	 const clocal = shrinkProg(children[0]).map(c => hh.LOCAL(attrs, c));

	 return leave(slocal.concat(clocal));
      } else {
	 const el = shrinkArray(children);
	 return leave(el.map(a => hh.LOCAL(attrs, a)));
      }
   }
}

/*---------------------------------------------------------------------*/
/*    shrink ::If ...                                                  */
/*---------------------------------------------------------------------*/
hhapi.If.prototype.shrink = function() {
   enter(this.constructor.name);
   
   const [ child0, child1 ] = this.children;
   const funcs = shrinkFunc(this.func);
   const c0 = shrinkProg(child0);
   const c1 = shrinkProg(child1);
   const res = [child0, child1];

   for (let i = 0; i < c0.length; i++) {
      res.push(hh.IF({apply: this.func}, c0[i], child1));
   }

   for (let i = 0; i < c1.length; i++) {
      res.push(hh.IF({apply: this.func}, child0, c1[i]));
   }

   return leave(res
      .concat(funcs.map(f => hh.IF({apply: f}, child0, child1))));
}

/*---------------------------------------------------------------------*/
/*    shrink ::Abort ...                                               */
/*---------------------------------------------------------------------*/
hhapi.Abort.prototype.shrink = function() {
   enter(this.constructor.name);
   
   const child0 = this.children[0];
   const c0 = shrinkProg(child0);
   const res = [child0];
   const funcs = shrinkFunc(this.func);

   enter(`-- ${this.constructor.name} (${child0.constructor.name}:${c0.length}) ${funcs.length}`);
   c0.forEach(c => {
      res.push(hh.ABORT({apply: this.func}, c));
   });
   leave(undefined);

   return leave(res.concat(funcs.map(f => hh.ABORT({apply: f}, child0))));
}

/*---------------------------------------------------------------------*/
/*    shrink ::Every ...                                               */
/*---------------------------------------------------------------------*/
hhapi.Every.prototype.shrink = function() {
   enter(this.constructor.name);

   const child0 = this.children[0];
   const c0 = shrinkProg(child0);
   const res = [child0, hh.IF({apply: this.func}, child0)];
   const funcs = shrinkFunc(this.func);

   c0.forEach(c => {
      res.push(hh.EVERY({apply: this.func}, c));
   });

   return leave(res.concat(funcs.map(f => hh.EVERY({apply: f}, child0))));
}

/*---------------------------------------------------------------------*/
/*    shrink ::LoopEach ...                                            */
/*---------------------------------------------------------------------*/
hhapi.LoopEach.prototype.shrink = function() {
   enter(this.constructor.name);
   
   const child0 = this.children[0];
   const c0 = shrinkProg(child0);
   const res = [child0];
   const funcs = shrinkFunc(this.func);

   enter(`-- ${this.constructor.name} (${child0.constructor.name}:${c0.length}) ${funcs.length}`);
   c0.forEach(c => {
      res.push(hh.LOOPEACH({apply: this.func}, c));
   });
   leave(undefined);

   return leave(res.concat(funcs.map(f => hh.LOOPEACH({apply: f}, child0))));
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

