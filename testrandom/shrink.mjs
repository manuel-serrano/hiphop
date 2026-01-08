/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/shrink.mjs         */
/*    -------------------------------------------------------------    */
/*    Author      :  robby findler & manuel serrano                    */
/*    Creation    :  Tue May 27 17:31:35 2025                          */
/*    Last change :  Thu Jan  8 10:05:19 2026 (serrano)                */
/*    Copyright   :  2025-26 robby findler & manuel serrano            */
/*    -------------------------------------------------------------    */
/*    Program shrinker                                                 */
/*=====================================================================*/
import * as hh from "../lib/hiphop.js";
import * as hhapi from "../lib/ast.js";
import { jsonToHiphop } from "./hiphop.mjs";
import { jsonToAst } from "./json.mjs";
import { parseExpr, exprToHiphop, exprEqual, newBinary } from "./expr.mjs"

export { shrinkA, shrinkB };

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
/*    shrinkA ...                                                      */
/*---------------------------------------------------------------------*/
function shrinkA(conf, prop) {
   const { prog, events } = conf;
   const progs = shrinkProg(prog, prop);

   if (progs.length === 0) {
      return [];
   } else {
      const sprogs = shrinkSignals(prog.sigDeclList, prog.children, hh.MODULE, hh.INOUT, prop)
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
	    return { prog: mod, events: nevents };
	 });

      return progs.map(prog => { return { prog, events } })
	 .concat(sprogs);
   }
}

/*---------------------------------------------------------------------*/
/*    shrinkB ...                                                      */
/*---------------------------------------------------------------------*/
function shrinkB(conf, prop) {
   const { prog, events } = conf;

   if (events.length === 1) {
      return [];
   } else {
      let sevents = shrinkArray(events, shrinkReactSigs);
      return sevents.map(events => { return { prog, events } });
   }
}

/*---------------------------------------------------------------------*/
/*    shrinkProg ...                                                   */
/*---------------------------------------------------------------------*/
function shrinkProg(prog, prop) {
   if (typeof prog === "number" && Number.isInteger(prog)) {
      return shrinkInt(prog);
   } else if (prog instanceof Array) {
      return shrinkArray(prog, o => shringProg(o , prop));
   } else if (prog instanceof hhapi.$ASTNode) {
      return prog.shrink(prop);
   } else {
      throw new Error("cannot shrink " + typeof prog + " " + prog);
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
function shrinkArray(a, elementShrinker) {
   let ans = [];
   
   for (let i = 0; i < a.length; i++) {
      ans.push(a.slice(0, i).concat(a.slice(i + 1, a.length)));
   }
   for (let i = 0; i < a.length; i++) {
      let si = elementShrinker(a[i])
      for (let j = 0; j < si.length; j++) {
	 ans.push(a.map((v, k) => (i === k) ? si[j] : v));
      }
   }
   
   return ans;
}

//console.error(shrinkArray([1], x => []), "vs", [[],[0]]);
//console.error(shrinkArray([1,2,3], x => []), "vs", [[2,3],[1,3],[1,2],[0,2,3],[1,1,3],[1,2,2]]);

/*---------------------------------------------------------------------*/
/*    shrinkSignalFunc ...                                             */
/*---------------------------------------------------------------------*/
function shrinkSignalFunc(func, sig, prop) {

   function shrink(obj, cnst) {
      console.error("SHRINK DELAY obj=", obj, "sig=", sig);
      switch (obj.node) {
	 case "constant":
	    return obj;
	 case "sig":
	    if (obj.value === sig) {
	       if (prop.config.expr !== 0) {
		  return {node: "constant", value: "false"};
	       } else {
		  return obj;
	       }
	    } else {
	       return obj;
	    }
	 case "unary": {
	    const xs = shrink(obj.expr, cnst);

	    if (xs.node === "constant") {
	       return {
		  node: "constant",
		  value: (xs.value === "true") ? "false" : "true"
	       }
	    } else {
	       return xs;
	    }
	 }
	 case "binary": {
	    const xlhs = shrink(obj.lhs, cnst);
	    const xrhs = shrink(obj.rhs, cnst);

	    if (cnst) {
	       return newBinary(obj.op, xlhs, xrhs);
	    } else if (xlhs.node === "constant") {
	       if (xrhs.node === "constant") {
		  return {
		     node: "constant",
		     value: true
		  };
	       } else {
		  return xrhs;
	       }
	    } else if (xrhs.node === "constant") {
	       return xlhs;
	    } else {
	       return xrhs;
	    }
	 }

	 default:
	    throw SyntaxError("Unsupported obj: " + obj.node);
      }
   }

   function shrinkExpr(func) {
      const x = func.toString().replace(/^function[(][)][ ]* { return /, "").replace(/;[ ]*}$/, "");
      const f = shrink(parseExpr(x), true);
      return eval(`(function() { return ${exprToHiphop(f)}; })`);
   }

   function shrinkDelay(func) {
      const x = shrink(func.tojson(), false);

      if (x.node === "constant") {
	 return false;
      } else {
	 return jsonToAst(x);
      }
   }

   if (!prop) throw new TypeError("prop is empty"); // ASSERT ==============

   if (func instanceof hh.$Delay) {
      return shrinkDelay(func);
   } else {
      return shrinkExpr(func);
   }
}

//console.error(shrinkSignalFunc(function() { return (this.xxx.now || (this.yyy.pre || this.xxx.now)) }, "xxx", { expr: 1 }).toString());

/*---------------------------------------------------------------------*/
/*    shrinkSignals ...                                                */
/*    -------------------------------------------------------------    */
/*    Remove one signal at a time.                                     */
/*---------------------------------------------------------------------*/
function shrinkSignals(decl, children, ctor, accessibility, prop) {
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
		  accessibility,
		  combine: (x, y) => (x + y)
	       }
	    }
	 });

	 console.error("SRINKING SIGS: ", Object.keys(attrs));
	 const prog = ctor(attrs, ...children.map(c => c.shrinkSignal(d.name, prop)));

	 res.push(prog);
	 console.error("PROG=", JSON.stringify(prog.tojson()));
	 console.error("-----------------");
      });
      
      return res;
   }
}

/*---------------------------------------------------------------------*/
/*    shrinkSignalASTNode ...                                          */
/*---------------------------------------------------------------------*/
function shrinkSignalASTNode(node, ctor, attr, sig, prop) {
   return ctor(attr, ...node.children.map(c => c.shrinkSignal(sig, prop)));
}

/*---------------------------------------------------------------------*/
/*    shrinkSignal ::$ASTNode ...                                      */
/*---------------------------------------------------------------------*/
hhapi.$ASTNode.prototype.shrinkSignal = function(sig, prop) {
   return this;
}

/*---------------------------------------------------------------------*/
/*    shrinkSignal ::Sequence ...                                      */
/*---------------------------------------------------------------------*/
hhapi.Sequence.prototype.shrinkSignal = function(sig, prop) {
   return shrinkSignalASTNode(this, hh.SEQUENCE, {}, sig, prop);
}

/*---------------------------------------------------------------------*/
/*    shrinkSignal ::Fork ...                                          */
/*---------------------------------------------------------------------*/
hhapi.Fork.prototype.shrinkSignal = function(sig, prop) {
   return shrinkSignalASTNode(this, hh.FORK, {}, sig, prop);
}

/*---------------------------------------------------------------------*/
/*    shrinkSignal ::Loop ...                                          */
/*---------------------------------------------------------------------*/
hhapi.Loop.prototype.shrinkSignal = function(sig, prop) {
   return shrinkSignalASTNode(this, hh.LOOP, {}, sig, prop);
}

/*---------------------------------------------------------------------*/
/*    shrinkSignal ::Trap ...                                          */
/*---------------------------------------------------------------------*/
hhapi.Trap.prototype.shrinkSignal = function(sig, prop) {
   const attrs = { [this.trapName]: this.trapName };
   return shrinkSignalASTNode(this, hh.TRAP, attrs, sig, prop);
}

/*---------------------------------------------------------------------*/
/*    shrinkSignal ::Emit ...                                          */
/*---------------------------------------------------------------------*/
hhapi.Emit.prototype.shrinkSignal = function(sig, prop) {
   if (this.signame_list[0] === sig) {
      return hh.NOTHING({});
   } else {
      return this;
   }
}

/*---------------------------------------------------------------------*/
/*    shrinkSignal ::Local ...                                         */
/*---------------------------------------------------------------------*/
hhapi.Local.prototype.shrinkSignal = function(sig, prop) {
   const attrs = {};
   this.sigDeclList.forEach(p => attrs[p.name] = { signal: p.name, name: p.name, combine: (x, y) => (x + y) }, true);
   return shrinkSignalASTNode(this, hh.LOCAL, attrs, sig, prop);
}

/*---------------------------------------------------------------------*/
/*    shrinkSignal ::If ...                                            */
/*---------------------------------------------------------------------*/
hhapi.If.prototype.shrinkSignal = function(sig, prop) {
   const func = shrinkSignalFunc(this.func, sig, prop);

   if (func) {
      return shrinkSignalASTNode(this, hh.IF, {apply: func}, sig, prop);
   } else {
      return this.children[0].shrinkSignal(sig, prop);
   }
}

/*---------------------------------------------------------------------*/
/*    shrinkSignal ::Suspend ...                                       */
/*---------------------------------------------------------------------*/
hhapi.Suspend.prototype.shrinkSignal = function(sig, prop) {
   const func = shrinkSignalFunc(this.func, sig, prop);

   if (func) {
      return shrinkSignalASTNode(this, hh.SUSPEND, {apply: func}, sig, prop);
   } else {
      return this.children[0].shrinkSignal(sig, prop);
   }
}

/*---------------------------------------------------------------------*/
/*    shrinkSignal ::Abort ...                                         */
/*---------------------------------------------------------------------*/
hhapi.Abort.prototype.shrinkSignal = function(sig, prop) {
   const func = shrinkSignalFunc(this.func, sig, prop);

   if (func) {
      return shrinkSignalASTNode(this, hh.ABORT, {apply: func}, sig, prop);
   } else {
      return this.children[0].shrinkSignal(sig, prop);
   }
}

/*---------------------------------------------------------------------*/
/*    shrinkSignal ::Every ...                                         */
/*---------------------------------------------------------------------*/
hhapi.Every.prototype.shrinkSignal = function(sig, prop) {
   const func = shrinkSignalFunc(this.func, sig, prop);

   if (func) {
      return shrinkSignalASTNode(this, hh.EVERY, {apply: func}, sig, prop);
   } else {
      return this.children[0].shrinkSignal(sig, prop);
   }
}

/*---------------------------------------------------------------------*/
/*    shrinkSignal ::LoopEach ...                                      */
/*---------------------------------------------------------------------*/
hhapi.LoopEach.prototype.shrinkSignal = function(sig, prop) {
   const func = shrinkSignalFunc(this.func, sig, prop);

   if (func) {
      return shrinkSignalASTNode(this, hh.LOOPEACH, {apply: func}, sig, prop);
   } else {
      return this.children[0].shrinkSignal(sig, prop);
   }
}

/*---------------------------------------------------------------------*/
/*    shrinkSignal ::Await ...                                         */
/*---------------------------------------------------------------------*/
hhapi.Await.prototype.shrinkSignal = function(sig, prop) {
   const func = shrinkSignalFunc(this.func, sig, prop);

   if (func) {
      return hh.AWAIT({apply: func});
   } else {
      return hh.NOTHING({});
   }
}

/*---------------------------------------------------------------------*/
/*    shrinkSignal ::Atom ...                                          */
/*---------------------------------------------------------------------*/
hhapi.Atom.prototype.shrinkSignal = function(sig, prop) {
   const func = shrinkSignalFunc(this.func, sig, prop);

   console.error("*** SHRINK ATOM", JSON.stringify(this.tojson()));

   if (func) {
      const attrs = { apply: func };
      return hh.ATOM(attrs);
   } else {
      return hh.NOTHING({});
   }
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
/*    shrinkTrap ::Suspend ...                                         */
/*---------------------------------------------------------------------*/
hhapi.Abort.prototype.shrinkTrap = function(trap) {
   const attrs = {apply: this.func};
   return shrinkTrapASTNode(this, hh.SUSPEND, attrs, trap);
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

   function shrink(obj, cnst) {
      switch (obj.node) {
	 case "constant":
	    return [];
	 case "sig":
	    if (cnst) {
	       return [{node: "constant", value: "true"}];
	    } else {
	       return [];
	    }
	 case "unary": {
	    const xs = shrink(obj.expr, cnst);
	    
	    return [obj.expr]
	       .concat(xs.map(x => {
		  return {
		     node: "unary",
		     op: obj.op,
		     expr: x }
	       }));
	 }
	 case "binary": {
	    const slhs = shrink(obj.lhs, cnst);
	    const srhs = shrink(obj.rhs, cnst);
	    return [obj.lhs, obj.rhs]
	       .concat(slhs.map(l => newBinary(obj.op, l, obj.rhs)))
	       .concat(srhs.map(r => newBinary(obj.op, obj.lhs, r)));
	 }
	 default:
	    throw SyntaxError("Unsupported obj: " + obj.node);
      }
   }

   function unique(arr) {
      return [...new Set(arr)];
   }

   function shrinkExpr(func) {
      enter(func.toString());
      const x = func.toString().replace(/^function[(][)][ ]* { return /, "").replace(/;[ ]*}$/, "");
      const xs = shrink(parseExpr(x), true);
      const fs = unique(xs.map(x => `(function() { return ${exprToHiphop(x)}; })`));
      return leave(fs.map(f => eval(f)), 32);
   }

   function shrinkDelay(func) {
      enter(func);

      const x = func.tojson();
      const xs = shrink(x, false);

      return leave(xs.map(jsonToAst), 32);
   }
   
   if (func instanceof hh.$Delay) {
      return shrinkDelay(func);
   } else {
      return shrinkExpr(func);
   }
}


/*---------------------------------------------------------------------*/
/*    shrinkASTNode ...                                                */
/*---------------------------------------------------------------------*/
function shrinkASTNode(node, ctor, attr, children, prop) {
   if (!prop) throw new TypeError("prop is empty"); // ASSERT ==============
   enter(node.constructor.name);
   
   if (children.length === 0) {
      return leave([hh.NOTHING({})]);
   } else if (children.length === 1) {
      return leave(shrinkProg(children[0], prop).map(c => ctor(attr, c)).concat(children));
   } else {
      const el = shrinkArray(children, o => shrinkProg(o, prop));
      return leave(el.map(a => ctor(attr, a)));
   }
}

/*---------------------------------------------------------------------*/
/*    shrink ::$ASTNode ...                                            */
/*---------------------------------------------------------------------*/
hhapi.$ASTNode.prototype.shrink = function(prop) {
   throw new Error(`shrink not implemented for "${this.constructor.name}"`);
}

/*---------------------------------------------------------------------*/
/*    shrink ::Module ...                                              */
/*---------------------------------------------------------------------*/
hhapi.Module.prototype.shrink = function(prop) {
   if (!prop) throw new TypeError("prop is empty"); // ASSERT ==============
   const el = shrinkArray(this.children, o => shrinkProg(o, prop));
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
hhapi.Nothing.prototype.shrink = function(prop) {
   return [];
}

/*---------------------------------------------------------------------*/
/*    shrink ::Pause ...                                               */
/*---------------------------------------------------------------------*/
hhapi.Pause.prototype.shrink = function(prop) {
   return [hh.NOTHING({})];
}

/*---------------------------------------------------------------------*/
/*    shrink ::Sequence ...                                            */
/*---------------------------------------------------------------------*/
hhapi.Sequence.prototype.shrink = function(prop) {
   return shrinkASTNode(this, hh.SEQUENCE, {}, this.children, prop);
}

/*---------------------------------------------------------------------*/
/*    shrink ::Fork ...                                                */
/*---------------------------------------------------------------------*/
hhapi.Fork.prototype.shrink = function(prop) {
   return this.children
      .concat([hh.SEQUENCE({}, this.children)])
      .concat(...shrinkASTNode(this, hh.FORK, {}, this.children, prop));
}

/*---------------------------------------------------------------------*/
/*    shrink ::Loop ...                                                */
/*---------------------------------------------------------------------*/
hhapi.Loop.prototype.shrink = function(prop) {
   return [hh.SEQUENCE({}, this.children)]
      .concat(...shrinkASTNode(this, hh.LOOP, {}, this.children, prop));
}

/*---------------------------------------------------------------------*/
/*    shrink ::Trap ...                                                */
/*---------------------------------------------------------------------*/
hhapi.Trap.prototype.shrink = function(prop) {
   enter(this.constructor.name);
   
   const children = this.children;
   const attr = {[this.trapName]: this.trapName};
   const res = [children[0].shrinkTrap(this.trapName)];

   if (children.length === 0) {
      return leave(res);
   } else if (children.length === 1) {
      return leave(res
	 .concat(shrinkProg(children[0], prop).map(c => hh.TRAP(attr, c))));
   } else {
      const el = shrinkArray(children, o => shrinkProg(o, prop));
      return leave(res.concat(el.map(a => hh.TRAP(attr, a))));
   }
}

/*---------------------------------------------------------------------*/
/*    shrink ::Exit ...                                                */
/*---------------------------------------------------------------------*/
hhapi.Exit.prototype.shrink = function(prop) {
   return [hh.PAUSE({})];
}

/*---------------------------------------------------------------------*/
/*    shrink ::Halt ...                                                */
/*---------------------------------------------------------------------*/
hhapi.Halt.prototype.shrink = function(prop) {
   return [hh.PAUSE({})];
}

/*---------------------------------------------------------------------*/
/*    shrink ::Emit ...                                                */
/*---------------------------------------------------------------------*/
hhapi.Emit.prototype.shrink = function(prop) {
   return [hh.NOTHING({})];
}

/*---------------------------------------------------------------------*/
/*    shrink ::Local ...                                               */
/*---------------------------------------------------------------------*/
hhapi.Local.prototype.shrink = function(prop) {
   if (!prop) throw new TypeError("prop is empty"); // ASSERT ==============
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
	 const slocal = shrinkSignals(this.sigDeclList, children, hh.LOCAL, false, prop);
	 const clocal = shrinkProg(children[0], prop).map(c => hh.LOCAL(attrs, c));

	 return leave(slocal.concat(clocal));
      } else {
	 const el = shrinkArray(children, o => shrinkProg(o , prop));
	 return leave(el.map(a => hh.LOCAL(attrs, a)));
      }
   }
}

/*---------------------------------------------------------------------*/
/*    shrink ::If ...                                                  */
/*---------------------------------------------------------------------*/
hhapi.If.prototype.shrink = function(prop) {
   enter(this.constructor.name);
   
   const [ child0, child1 ] = this.children;
   const funcs = shrinkFunc(this.func);
   const c0 = shrinkProg(child0, prop);
   const c1 = shrinkProg(child1, prop);
   const res = [child0, child1];

   for (let i = 0; i < c0.length; i++) {
      res.push(hh.IF({apply: this.func}, c0[i], child1));
   }

   for (let i = 0; i < c1.length; i++) {
      res.push(hh.IF({apply: this.func}, child0, c1[i]));
   }

   return leave(res)
      .concat(funcs.map(f => hh.IF({apply: f}, child0, child1)));
}

/*---------------------------------------------------------------------*/
/*    shrink ::Suspend ...                                             */
/*---------------------------------------------------------------------*/
hhapi.Suspend.prototype.shrink = function(prop) {
   enter(this.constructor.name);
   
   const funcs = shrinkFunc(this.func);
   const child0 = this.children[0];
   const c0 = shrinkProg(child0, prop);
   const res = [child0];

   for (let i = 0; i < c0.length; i++) {
      res.push(hh.SUSPEND({apply: this.func}, c0[i]));
   }

   return leave(res)
      .concat(funcs.map(f => hh.SUSPEND({apply: f}, child0)));
}


/*---------------------------------------------------------------------*/
/*    shrink ::Abort ...                                               */
/*---------------------------------------------------------------------*/
hhapi.Abort.prototype.shrink = function(prop) {

   function expand(node) {
      const trap = gentrap("abort");
      const trapattr = {[trap]: trap};
      const applyattr = {apply: node.func};
      return hh.TRAP(
	 trapattr,
	 hh.FORK(
	    {},
	    hh.SEQUENCE(
	       {},
	       hh.SUSPEND(
		  applyattr,
		  node.children[0]),
	       hh.EXIT(trapattr)),
	    hh.LOOP(
	       {},
	       hh.SEQUENCE(
		  {},
		  hh.PAUSE({}),
		  hh.IF(
		     applyattr,
		     hh.EXIT(trapattr))))));
   }
	    
   enter(this.constructor.name);
   
   const child0 = this.children[0];
   const c0 = shrinkProg(child0, prop);
   const present = hh.IF({apply: this.func}, hh.NOTHING({}), child0);
   const res = [child0, present, expand(this)];
   const funcs = shrinkFunc(this.func);

   c0.forEach(c => {
      res.push(hh.ABORT({apply: this.func}, c));
   });

   return leave(res.concat(funcs.map(f => hh.ABORT({apply: f}, child0))));
}

/*---------------------------------------------------------------------*/
/*    shrink ::Every ...                                               */
/*---------------------------------------------------------------------*/
hhapi.Every.prototype.shrink = function(prop) {
   
   function expand(node) {
      const applyattr = {apply: node.func};
      return hh.SEQUENCE(
	 {},
	 hh.AWAIT(applyattr),
	 hh.LOOPEACH(
	    applyattr,
	    node.children[0]));
   }
   
   enter(this.constructor.name);

   const child0 = this.children[0];
   const c0 = shrinkProg(child0, prop);
   const res = [child0, hh.IF({apply: this.func}, child0), expand(this)];
   const funcs = shrinkFunc(this.func);

   c0.forEach(c => {
      res.push(hh.EVERY({apply: this.func}, c));
   });

   return leave(res.concat(funcs.map(f => hh.EVERY({apply: f}, child0))));
}

/*---------------------------------------------------------------------*/
/*    shrink ::LoopEach ...                                            */
/*---------------------------------------------------------------------*/
hhapi.LoopEach.prototype.shrink = function(prop) {

   function expand(node) {
      return hh.LOOP(
	 {},
	 hh.ABORT(
	    {apply: node.func},
	    hh.SEQUENCE(
	       {},
	       node.children[0],
	       hh.HALT({}))));
   }
   
   enter(this.constructor.name);

   const child0 = this.children[0];
   const c0 = shrinkProg(child0, prop);
   const res = [child0, expand(this)];
   const funcs = shrinkFunc(this.func);

   c0.forEach(c => {
      res.push(hh.LOOPEACH({apply: this.func}, c));
   });

   return leave(res.concat(funcs.map(f => hh.LOOPEACH({apply: f}, child0))));
}

/*---------------------------------------------------------------------*/
/*    shrink ::Atom ...                                                */
/*---------------------------------------------------------------------*/
hhapi.Atom.prototype.shrink = function(prop) {
   enter(this.constructor.name);
   const funcs = shrinkFunc(this.func);
   return leave([hh.NOTHING({})].concat(funcs.map(f => hh.ATOM({apply: f}))));
}

/*---------------------------------------------------------------------*/
/*    shrink ::Await ...                                               */
/*---------------------------------------------------------------------*/
hhapi.Await.prototype.shrink = function(prop) {
   
   function expand(node) {
      const trap = gentrap("await");
      const trapattr = {[trap]: trap};
      const applyattr = {apply: node.func};
      return hh.SEQUENCE(
	 {},
	 hh.PAUSE({}),
	 hh.TRAP(
	    trapattr,
	    hh.LOOP(
	       {},
	       hh.IF(
		  applyattr,
		  hh.EXIT(trapattr),
		  hh.PAUSE({})))));
   }
   
   const funcs = shrinkFunc(this.func);
   return [hh.PAUSE({}), expand(this)]
      .concat(funcs.map(f => hh.AWAIT({apply: f})));
}

/*---------------------------------------------------------------------*/
/*    shrink ::Sync ...                                                */
/*---------------------------------------------------------------------*/
hhapi.Sync.prototype.shrink = function(prop) {
   return [];
}

/*---------------------------------------------------------------------*/
/*    gentrap ...                                                      */
/*---------------------------------------------------------------------*/
let trapCnt = 0;
   
function gentrap(lbl){
   return lbl + trapCnt++;
}   

/*---------------------------------------------------------------------*/
/*    shrinkReactSigs ...                                              */
/*---------------------------------------------------------------------*/
function shrinkReactSigs(signals) {
   if (signals === null) {
      return [];
   } else {
      let keys = Object.keys(signals);
      let arrs = shrinkArray(keys, o => []);

      return arrs.map(keys => {
	 const obj = {};
	 keys.forEach(k => obj[k] = signals[k]);
	 return obj;
      });
   }
}
