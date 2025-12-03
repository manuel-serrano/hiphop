/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/compiler.js               */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal, Manuel Serrano                       */
/*    Creation    :  Mon Jul 16 18:06:28 2018                          */
/*    Last change :  Wed Dec  3 06:37:47 2025 (serrano)                */
/*    Copyright   :  2018-25 Inria                                     */
/*    -------------------------------------------------------------    */
/*    HipHop compiler                                                  */
/*    -------------------------------------------------------------    */
/*    The compilation of HipHop programs implements the translations   */
/*    of Chapter 11 & 12 of Berry's book:                              */
/*      The Constructive Semantics of Pure Esterel, Draft Version 3    */
/*      Dec 2022                                                       */
/*=====================================================================*/
"use strict";
"use hopscript";

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
import { Process as process } from "./config.js";
import * as ast from "./ast.js";
import * as error from "./error.js";
import * as net from "./net.js";
import * as signal from "./signal.js";
import * as ccutils from "./compiler-utils.js";
import * as sweep from "./sweep.js";
import * as causality from "./causality.js";
import { loopSafe } from "./loopsafe.js";
import { basename } from "node:path";

export { compile };

/*---------------------------------------------------------------------*/
/*    assert & debug                                                   */
/*    -------------------------------------------------------------    */
/*    HIPHOP_TRACE=...,compile,connect,trace     compiler debug        */
/*    HIPHOP_TRACE_CIRCUIT=Pause,Fork,Trap,...   propagate debug       */
/*    HIPHOP_ORIG=Pause,Fork,...                 compiler version      */
/*---------------------------------------------------------------------*/
const assert = (process.env.NEW === "true");
const newCompilerFuns = process.env.HIPHOP_NEW ? process.env.HIPHOP_NEW.split(",") : [];
const intCompilerFuns = process.env.HIPHOP_INT ? process.env.HIPHOP_INT.split(",") : [];
const debug = process.env.HIPHOP_TRACE
   && process.env.HIPHOP_TRACE.split(",").find(n => n === "compile");
const debugConnect = process.env.HIPHOP_TRACE
   && process.env.HIPHOP_TRACE.split(",").find(n => n === "connect");
const debugTrace = process.env.HIPHOP_TRACE
   && process.env.HIPHOP_TRACE.split(",").find(n => n === "trace");
const debugTraceCircuit = process.env.HIPHOP_TRACE_CIRCUIT?.split(",") || [];

/*---------------------------------------------------------------------*/
/*    compiler ...                                                     */
/*---------------------------------------------------------------------*/
function compiler(astNode) {
   if (newCompilerFuns.indexOf(astNode.ctor) >= 0) {
      return "new";
   } else if (intCompilerFuns.indexOf(astNode.ctor) >=0) {
      return "int";
   } else {
      return astNode.machine.compiler;
   }
}

/*---------------------------------------------------------------------*/
/*    margins ...                                                      */
/*---------------------------------------------------------------------*/
let debugMargins = ["", " ", "  ", "   ", "    "];
let margin = 0;

function getMargin(margin) {
   if (margin === debugMargins.length) {
      debugMargins.push(debugMargins[margin - 1] + " ");
   }
   return debugMargins[margin];
}

/*---------------------------------------------------------------------*/
/*    traceNode ...                                                    */
/*---------------------------------------------------------------------*/
function traceNode(astNode) {
   if (debug) {
      return `${astNode.constructor.name}[${astNode.depth}|${astNode.trapDepth + 2}]@${astNode.loc.pos} ${astNode.id} (${compiler(astNode)})`
   }
}

/*---------------------------------------------------------------------*/
/*    traceEnter ...                                                   */
/*---------------------------------------------------------------------*/
function traceEnter(...args) {
   if (debug) {
      console.error(getMargin(margin) + ">", ...args);
      margin++;
   }
}

/*---------------------------------------------------------------------*/
/*    traceExit ...                                                    */
/*---------------------------------------------------------------------*/
function traceExit(...args) {
   if (debug) {
      margin--;
      console.error(getMargin(margin) + "<", ...args);
   }
}

/*---------------------------------------------------------------------*/
/*    trace ...                                                        */
/*---------------------------------------------------------------------*/
function trace(...args) {
   if (debug) {
      console.error(getMargin(margin), ...args);
   }
}

/*---------------------------------------------------------------------*/
/*    Circuit ...                                                      */
/*    -------------------------------------------------------------    */
/*    Circuit definition of a circuit. It also contains methods        */
/*    to get embeded RES, SUSP and KILL wires.                         */
/*---------------------------------------------------------------------*/
// @sealed
class Circuit {
   astNode;
   type;
   goList;
   killList;
   kMatrix;
   res;
   susp;
   sel;
   
   constructor(astNode, goList, res, susp, killList, sel, kMatrix) {
      this.astNode = astNode;

      this.goList = goList;
      this.res = res;
      this.susp = susp;
      this.killList = killList;

      this.sel = sel;
      this.kMatrix = kMatrix;

      // debug
      if (debugTrace || debugTraceCircuit.indexOf(astNode.ctor) >= 0) {
	 if (goList) goList.forEach(n => n.setDebugTrace());
	 if (killList) killList.forEach(n => n.setDebugTrace());
	 if (sel) sel.setDebugTrace();
	 if (res) res.setDebugTrace();
	 if (kMatrix) kMatrix.forEach(m => { if (m) m.forEach(n => n.setDebugTrace()) });
      }
   }
}

/*---------------------------------------------------------------------*/
/*    assertCircuitInterfaceConnections ...                            */
/*    -------------------------------------------------------------    */
/*    Check to all interface wires are property connected to           */
/*    something.                                                       */
/*---------------------------------------------------------------------*/
function assertCircuitInterfaceConnections(c) {
   if (assert) {
      // go
      if (!(c.goList instanceof Array))
      	 throw error.TypeError(`"goList" must be an array for ${c.astNode.constructor.name}`);
      c.goList.forEach((w, i, _ ) => {
	 if (w.fanoutList.length === 0)
	    throw new Error(`"go/${i}" disconnected in ${c.astNode.constructor.name}`);
      });
      if (c.goList.length !== c.astNode.depth + 1) {
      	 throw error.TypeError(`"goList" wrong size ${c.goList.length}/${c.astNode.depth}`);
      }
      
      // res
      if (c.res.fanoutList.length === 0)
	 throw new Error(`"res" disconnected in ${c.astNode.constructor.name}`);
      // susp
      if (c.susp.fanoutList.length === 0)
	 throw new Error(`"susp" disconnected in ${c.astNode.constructor.name}`);
      // killList
      if (c.killList && !(c.killList instanceof Array))
      	 throw error.TypeError(`"killList" must be an array for ${c.astNode.constructor.name}`);
      c.killList.forEach((w, i, _) => {
	 if (w.fanoutList.length === 0)
	    throw new Error(`"kill/${i}" disconnected in ${c.astNode.constructor.name}`);
      });
      if (c.killList.length !== c.astNode.depth + 1) {
      	 throw error.TypeError(`"killList" wrong size ${c.killList.length}/${c.astNode.depth}`);
      }

      // sel
      if (c.sel.faninList.length === 0)
	 throw new Error(`"sel" disconnected in ${c.astNode.constructor.name}`);
      // k
      if (!(c.kMatrix instanceof Array))
      	 throw error.TypeError(`"kMatrix must" be a matrix for ${c.astNode.constructor.name}`);

      for (let k = 0; k < c.kMatrix.length; k++) {
      	 if (!(c.kMatrix[k] instanceof Array)) {
	    if (c.kMatrix[k]) {
	       throw error.TypeError("Each completion code of `kMatrix` " +
		  "must be an array \"" +
		  c.kMatrix[k].toString() +
		  "\".", c.astNode.loc);
	    }
      	 }
      }
      c.kMatrix.forEach((k, i, _) => k.forEach((w, j, _) => {
	 if (w.faninList.length === 0)
	    throw new Error(`"kMatrix[${i}]/${j}" disconnected in ${c.astNode.constructor.name}`);
      }));
      
      c.kMatrix.forEach((k, i, _) => {
	 if (k.length !== c.astNode.depth + 1) {
	    throw new Error(`${c.astNode.constructor.name}: wrong "k[${i}]" size ${k.length}/${c.astNode.depth}`);
	 }
      });
      
      
   }
   return c;
}
   
/*---------------------------------------------------------------------*/
/*    assertCircuitInterface ...                                       */
/*    -------------------------------------------------------------    */
/*    A set of assertions that should not be disabled in production.   */
/*    These asserts mostly check that there is no illegal mix of       */
/*    old and new compiler interfaces (the old compiler was not using  */
/*    explicit wires of the circuit interface).                        */
/*---------------------------------------------------------------------*/
function assertCircuitInterface(c) {

   function checkNetList(list, name) {
      if (!c.goList)
	 throw new Error(`bad circuit "${c.astNode.constructor.name}", missing ${name}`);
      if (!c.goList.length === l)
	 throw new Error(`bad circuit "${c.astNode.constructor.name}", wrong ${name} length`);
      c.goList.forEach((e, i, _) => {
	 if (!(e instanceof net.Net)) {
	    throw new Error(`bad circuit "${c.astNode.constructor.name}", wrong net ${name}[${i}]`);
	 }
      });
   }
      
   const astNode = c.astNode;
   const l = astNode.depth;

   checkNetList(c.goList, "goList");
   checkNetList(c.killList, "killList");
   if (!c.kMatrix)
      throw new Error(`bad circuit "${c.astNode.constructor.name}", wrong kMatrix`);
   for (let k = 0; k < c.kMatrix.length; k++) {
      checkNetList(c.kMatrix[k], `kMatrix[${k}]`);
   }

   if (!(c.res instanceof net.Net))
      throw new Error(`bad circuit "${c.astNode.constructor.name}", wrong net res (${c.res})`);
   if (!(c.susp instanceof net.Net))
      throw new Error(`bad circuit "${c.astNode.constructor.name}", wrong net susp`);
   if (!(c.sel instanceof net.Net))
      throw new Error(`bad circuit "${c.astNode.constructor.name}", wrong net sel`);
}

/*---------------------------------------------------------------------*/
/*    makeCircuitInterface ...                                         */
/*    -------------------------------------------------------------    */
/*    Create all the circuit wires.                                    */
/*---------------------------------------------------------------------*/
function makeCircuitInterface(astNode) {
   
   function makeWireList(length, astNode, name) {
      return Array.from({length}, (_, i) => 
	 new net.WireNet(astNode, name, i));
   }

   function makeKMatrix(l, astNode, length) {
      return Array.from({length}, (_, i) =>
	 makeWireList(l, astNode, `k${i}`));
   }
   
   const l = astNode.depth;
   const goList = makeWireList(l + 1, astNode, "go");
   const res = new net.WireNet(astNode, "res", l);
   const susp = new net.WireNet(astNode, "susp", l);
   const killList = makeWireList(l + 1, astNode, "kill");
   const kMatrix = makeKMatrix(l + 1, astNode, astNode.trapDepth + 2);
   const sel = new net.WireNet(astNode, "sel", l);

   if (astNode.machine.dynamic) {
      sel.sweepable = false;
   }
   
   if (assert) {
      Object.seal(goList);
      Object.seal(killList);
      Object.seal(kMatrix);
      kMatrix.forEach(k => Object.seal(k));
   }
   
   return { l, goList, res, susp, killList, kMatrix, sel };
}

/*---------------------------------------------------------------------*/
/*    unOptAxs ...                                                     */
/*---------------------------------------------------------------------*/
const unOptAxs = {
   get_pre: true,
   get_value: true,
   aliases: []
}
   
/*---------------------------------------------------------------------*/
/*    addAxs ...                                                       */
/*---------------------------------------------------------------------*/
function addAxs(axs, table) {
   let o = table.get(axs.signame);

   if (o) {
      if (axs.get_pre && !o.get_pre) {
	 o.get_pre = true;
	 o.aliases.forEach(a => a.get_pre = true);
      }

      if (axs.get_value && !o.get_value) {
	 o.get_value = true;
	 o.aliases.forEach(a => a.get_value = true);
      }
   } else {
      let o = {get_pre: axs.get_pre, get_value: axs.get_value, aliases: []};
      table.set(axs.signame, o);
   }
}

/*---------------------------------------------------------------------*/
/*    addAlias ...                                                     */
/*---------------------------------------------------------------------*/
function addAlias(signame, sigalias, table) {
   let o = table.get(signame);
   let a = table.get(sigalias);

   if (!o) {
      if (!a) {
	 a = {get_pre: false, get_value: false, aliases: []};
	 table.set(sigalias, a);
      }
      o = {get_pre: false, get_value: false, aliases: [a]};
      table.set(signame, o);
   } else {
      if (!a) {
	 a = {get_pre: o.get_pre, get_value: o.get_value, aliases: []};
	 o.aliases.push(o);
      } else {
	 if (o.aliases.indexOf(a) < 0) {
	    a.get_pre != o.get_pre;
	    a.get_value != o.get_value;
	    o.aliases.push(a);
	 }
      }
   }
}

/*---------------------------------------------------------------------*/
/*    collectSigAccesses ...                                           */
/*---------------------------------------------------------------------*/
function collectSigAccesses(node, table) {
   if (node instanceof ast.$ActionNode) {
      if (node.func instanceof ast.$Delay) {
	 node.func.accessor_list.forEach(s => addAxs(s, table));
      } else {
	 node.accessor_list.forEach(s => addAxs(s, table));
      }
      if (node instanceof ast.$Emit) {
	 node.if_accessor_list.forEach(s => addAxs(s, table));
      }
   } else if (node instanceof ast.$Exec) {
      node.accessor_list.forEach(s => addAxs(s, table));
   } else if (node instanceof ast.$Run) {
      node.sigDeclList.forEach(sigprop => {
	 const { name, alias } = sigprop;

	 addAlias(name, alias, table);
      });
   }

   node.children.forEach(n => collectSigAccesses(n, table));
}

/*---------------------------------------------------------------------*/
/*    getSignalObject ...                                              */
/*    -------------------------------------------------------------    */
/*    Lookup the signal declaration.                                   */
/*    Env is a list of SignalProperties (see ast.js).                  */
/*---------------------------------------------------------------------*/
function getSignalObject(env, signame, astNode) {

   function unbound_error() {
      throw error.TypeError(`${astNode.tag}: unbound signal ${signame}`,
			    astNode.loc);
   }

   for (let i = env.length - 1; i >= 0; i--) {
      const sigprop = env[i];

      if (signame === sigprop.name) {
	 if (sigprop.signal) {
	    return sigprop.signal;
	 } else {
      	    throw error.TypeError(`${astNode.tag}: wrong signal ${signame}`,
				  astNode.loc);
	 }
      }
   }

   if (!astNode.autoComplete) {
      unbound_error();
   } else {
      return false;
   }
}

/*---------------------------------------------------------------------*/
/*    signalGate ...                                                   */
/*    -------------------------------------------------------------    */
/*    Returns the signal gate at a specific incarnation level.         */
/*---------------------------------------------------------------------*/
function signalGate(sig, l) {
   const gate_list = sig.gate_list;

   if (gate_list.length <= l) {
      return gate_list[gate_list.length - 1];
   } else {
      return gate_list[l];
   }
}

/*---------------------------------------------------------------------*/
/*    bindSigAccessorList ...                                          */
/*    -------------------------------------------------------------    */
/*    Bind each signal of accessorList to its signal declaration.      */
/*---------------------------------------------------------------------*/
function bindSigAccessorList(env, accessorList, astNode) {
   accessorList.forEach(sigprop => {
      sigprop.signal = getSignalObject(env, sigprop.signame, astNode);
   });
}

/*---------------------------------------------------------------------*/
/*    linkSigDeclList ...                                              */
/*---------------------------------------------------------------------*/
function linkSigDeclList(env, siglist, astNode) {
   siglist.forEach(sigdecl => {
      if (sigdecl.alias) {
	 sigdecl.signal = getSignalObject(env, sigdecl.alias, astNode);
      }
   });
}

/*---------------------------------------------------------------------*/
/*    connMode ...                                                     */
/*---------------------------------------------------------------------*/
const connMode = { GO: 101, K: 102, KGO: 103, KK: 104, FORK: 105, MERGE: 106, BRANCH: 107, CONNECT: 108 };

/*---------------------------------------------------------------------*/
/*    makeUnconnectedNet ...                                           */
/*---------------------------------------------------------------------*/
function makeUnconnectedNet(n, i) {
   return new net.WireNet(n.astNode, `unconnect.0^${n.debugName}`, i);
}

/*---------------------------------------------------------------------*/
/*    connectToList ...                                                */
/*    -------------------------------------------------------------    */
/*    Connect all the corresponding FROM gates to the TO gates.        */
/*    -------------------------------------------------------------    */
/*    the mode argument controls how the two lists are connected.      */
/*     * mode = GO: FROM.length <= TO.length                           */
/*         missing TO elements are connected to zero.                  */
/*     * mode = K: FROM.length >= TO.length                            */
/*         extra FROM elements are or-ed into n-1                      */
/*---------------------------------------------------------------------*/
function connectToList(from_list, to_list, mode = connMode.BRANCH) {
   const fl = from_list.length;
   const tl = to_list.length;
   const connType = net.FAN.STD;

   switch (mode) {
      case connMode.GO:
	 if (fl > tl) {
	    throw new Error(`connectToList(GO), from list too big ${fl}/${tl}`);
	 } else {
	    for (let i = 0; i < fl; i++) {
	       connectTo(from_list[i], to_list[i], connType);
	    }
	    if (fl < tl) {
	       if (fl + 1 !== tl) {
		  throw new Error(`connectToList(GO), from list too small ${fl}/${tl}`);
	       }
	       const last = to_list[tl - 1];
	       connectTo(makeUnconnectedNet(last, tl - 1), last, connType);
	    }
	 }
	 return;

      case connMode.K:
	 if (fl < tl) {
	    throw new Error(`connectToList(K), from list too small ${fl}/${tl}`);
	 }
      case connMode.KK:
	 for (let i = 0; i < tl - 1; i++) {
	    connectTo(from_list[i], to_list[i], connType);
	 }
	 if (fl === tl) {
	    connectTo(from_list[fl - 1], to_list[tl - 1], connType);
	 } else if (fl - 1 !== tl) {
	    throw new Error(`connectToList(K), from list too big ${fl}/${tl}`);
	 } else {
	    const last2 = from_list[fl - 2];
	    const last1 = from_list[fl - 1];
	    const or = net.makeOr(last1.astNode, last2.debugName + "v" + last1.debugName, fl - 2);
	    connectTo(last2, or);
	    connectTo(last1, or);
	    connectTo(or, to_list[tl - 1]);

	 }
	 return;

      case connMode.KGO:
	 if (fl > tl) {
	    // the last gate of tl will receive several connections so
	    // it nees to be an or-gate
	    const or = net.makeOr(to_list[tl - 1].astNode, "go", tl - 1);
	    connectTo(or, to_list[tl - 1]);
	    to_list[tl - 1] = or;
	 }
	 for (let i = 0; i < fl; i++) {
	    if (from_list[i]) {
	       if (i >= tl) {
		  connectTo(from_list[i], to_list[tl - 1]);
	       } else {
		  connectTo(from_list[i], to_list[i]);
	       }		  
	    }
	 }
	 return;

      default:
	 throw new Error(`connectToList(???), illegal mode ${mode}`);
   }
}

/*---------------------------------------------------------------------*/
/*    connectTo ...                                                    */
/*---------------------------------------------------------------------*/
function connectTo(from, to, connType = net.FAN.STD) {
   if (debugConnect)
      trace(`connect ${from.id} ${from.debugName} -> ${to.id} ${to.debugName}`);
   return from.connectTo(to, connType);
}

/*---------------------------------------------------------------------*/
/*    connectToWire ...                                                */
/*    -------------------------------------------------------------    */
/*    As connectTo, but if to is a wire with a fanin, create an        */
/*    explicit or net and return it.                                   */
/*---------------------------------------------------------------------*/
function connectToWire(from, to, mode) {
   if (to instanceof net.WireNet) {
      if (to.faninList.length > 0) {
	 const or = net.makeOr(to.astNode, "orWire");
	 or.faninList = to.faninList;
	 or.faninList[0].antagonist.net = or;
	 to.faninList = [];
	 connectTo(or, to);
	 connectTo(from, or, mode);
	 return or;
      } else {
	 connectTo(from, to, mode);
	 return to;
      }
	 
   } else {
      connectTo(from, to, mode);
      return to;
   }
}

/*---------------------------------------------------------------------*/
/*    replace ...                                                      */
/*---------------------------------------------------------------------*/
function replace(old, by) {
   by.fanoutList = old.fanoutList;
   by.faninList = old.faninList;
   by.fanoutList.forEach(f => f.antagonist.net = by);
   by.faninList.forEach(f => f.antagonist.net = by);
   old.faninList = [];
   old.fanouList = [];
}
   
/*---------------------------------------------------------------------*/
/*    linkDynamicNode ...                                              */
/*---------------------------------------------------------------------*/
function linkDynamicNode(astNode) {
   //
   // This function must be called *only* in ast.*.makeCircuit() and
   // *never* in make*. Otherwise, it could result that the oneshot
   // register is push not on the top of dynamically added branch but
   // inside an embded instruction
   //
   if (astNode.dynamic) {
      const reg = new net.RegisterNet(astNode, "oneshot_register", 0);
      const const0 = net.makeOr(astNode, "oneshot_register_reset");
      const l = astNode.depth;

      connectTo(const0, reg);
      connectTo(reg, const0, net.FAN.DEP);

      // replace goList[l] if it is a wire net as these nets only
      // accept one single fanin
      if (astNode.circuit.goList[l] instanceof net.WireNet) {
	 const old = astNode.circuit.goList[l];
	 const or = net.makeOr(astNode, "or-go", old.lvl);
	 
	 replace(old, or);
	 astNode.machine.nets = astNode.machine.nets.filter(n => n !== old);
	 astNode.net_list = astNode.net_list.filter(n => n !== old);

	 astNode.circuit.goList[l] = or;
      }
      connectTo(reg, astNode.circuit.goList[l]);
      reg.dynamic = true;
      astNode.dynamic = false;
   }
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::ASTNode ...                                        */
/*---------------------------------------------------------------------*/
ast.ASTNode.prototype.makeCircuit = function(env, sigtable) {
   throw error.TypeError("makeCircuit: no implementation for this node `"
      + this.tag + "'", this.loc);
}

/*---------------------------------------------------------------------*/
/*    delayName ...                                                    */
/*---------------------------------------------------------------------*/
function delayName(expr) {
   if (expr instanceof ast.DelaySig) {
      return `${expr.id}.${expr.prop}`;
   } else if (expr instanceof ast.DelayUnary) {
      return `${expr.op}${delayName(expr.delay)}`;
   } else if (expr instanceof ast.DelayBinary) {
      return `${delayName(expr.lhs)}${expr.op}${delayName(expr.rhs)}`;
   } else {
      throw new TypeError("Illegal delay " + expr);
   }
}

/*---------------------------------------------------------------------*/
/*    makePresentNet ...                                               */
/*---------------------------------------------------------------------*/
function makePresentNet(env, astNode, expr, level) {
   const name = delayName(expr);

   bindSigAccessorList(env, expr.accessor_list, astNode);

   if (expr instanceof ast.DelaySig) {
      const n = net.makeAnd(astNode, name, level);
      signal.runtimeSignalAccessor(astNode, expr.accessor_list, level, n, net.FAN.STD);
      return n;
   } else if (expr instanceof ast.DelayBinary) {
      const lhs = makePresentNet(env, astNode, expr.lhs, level);
      const rhs = makePresentNet(env, astNode, expr.rhs, level);
      const b = (expr.op === "&&")
	 ? net.makeAnd(astNode, name, level)
	 : net.makeOr(astNode, name, level);
      const n = net.makeAnd(astNode, name, level);

      lhs.connectTo(b, net.FAN.STD);
      rhs.connectTo(b, net.FAN.STD);
      b.connectTo(n, net.FAN.STD);
      
      return n;
   } else if (expr instanceof ast.DelayUnary) {
      const e = makePresentNet(env, astNode, expr.delay, level);
      const n = net.makeAnd(astNode, name, level);
      e.connectTo(n, net.FAN.NEG);
      return n;
   } else {
      throw new TypeError("hiphop:compiler:makePresentNet: illegal expression"
	 + expr);
   }
}

/*---------------------------------------------------------------------*/
/*    makeExpressionNet ...                                            */
/*---------------------------------------------------------------------*/
function makeExpressionNet(env, astNode, level) {
   let n = null;

   if (astNode.func instanceof ast.$Delay) {
      return makePresentNet(env, astNode, astNode.func, level);
   } else if (astNode.func || astNode.accessor_list.length > 0) {
      const name = astNode.loc?.filename
	 ? `${basename(astNode.loc.filename)}:${astNode.loc.pos}`
	 : astNode.constructor.name;
      bindSigAccessorList(env, astNode.accessor_list, astNode);
      n = new net.TestExpressionNet(astNode, name, level,
				    astNode.func, astNode.accessor_list);

   }

   return n;
}

/*---------------------------------------------------------------------*/
/*    makeCounterNet ...                                               */
/*---------------------------------------------------------------------*/
function makeCounterNet(env, astNode) {
   let counter = 0;
   const decr_counter_func = function() {
      if (counter > 0) counter--;
      return counter == 0;
   }
   const res = new net.TestExpressionNet( astNode, "decr_counter",
					  0, decr_counter_func, []);
   const func_count = astNode.func_count;
   let counter_val;
   const init_counter_func =
      func_count.toString().match(/function[ ]*[(][)][ \n]*{[ \n]*return[ ]+[0-9]+;/)
      ? function() {
	 return counter = parseInt(func_count.call(this));
      }
      : function() {
	 const init_val = parseInt(func_count.call(this));
	 if (init_val < 1) {
	    error.RuntimeError( "Assert counter expression > 0 failed.",
				astNode.loc);
	 }
	 counter = init_val;
	 return init_val;
      };

   bindSigAccessorList(env, astNode.accessor_list_count, astNode);
   const init_net = new net.ActionNet(astNode, "init_counter", 0,
				      init_counter_func,
				      astNode.accessor_list_count);

   try {
      const init_val = init_counter_func();
      if (init_val > 0) {
         init_net.init_val = parseInt(func_count.call(this)); 
      }
   } catch(error){
      ;
   }

   const init_or = net.makeOr(astNode, "init_or");

   connectTo(init_or, init_net);

   return { cnt: res, reset: init_or };
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Fork ...                                           */
/*    -------------------------------------------------------------    */
/*    Fig 11.10, page 122                                              */
/*---------------------------------------------------------------------*/
ast.Fork.prototype.makeCircuit = function(env, sigtable) {
   traceEnter(traceNode(this), "...");

   const ccs = this.children
      .filter(c => !(c instanceof ast.Sync))
      .map((c, i, arr) => c.makeCircuit(env, sigtable));
   const circuit = makeForkCircuit(env, this, ccs);
   
   this.circuit = circuit;
   linkDynamicNode(this);

   traceExit(traceNode(this));
   
   return circuit;
}

/*---------------------------------------------------------------------*/
/*    makeSynchronizer ...                                             */
/*    -------------------------------------------------------------    */
/*    Fig 11.1, page 122                                               */
/*---------------------------------------------------------------------*/
function makeSynchronizer(astNode, cLength, rLevel) {
   const kLength = astNode.trapDepth + 2;
   // create a sync dummy node for debugging purposes
   const syncNode = new ast.Sync("Sync", astNode);
   
   // "union" is a matrix (2d array) which is indexed by return code
   // and then by incarnation level
   const unions = Array.from({length: kLength}, (_, k) =>
      Array.from({length: rLevel + 1}, (_, i) =>
	 net.makeOr(syncNode, "Vk" + k, i)));

   // "mins" is a cube (3D array) which is indexed by children,
   // by return code, and then by incarnation level
   const mins = Array.from({length: cLength}, (_, n) =>
      Array.from({length: kLength}, (_, k) =>
	 Array.from({length: rLevel + 1}, (_, i) =>
	    net.makeOr(syncNode, "min_k" + k + "[" + n + "]", i))));

   // build K output doors and connect unions to them
   const kMatrix = Array.from({length: kLength}, (_, k) =>
      Array.from({length: rLevel + 1}, (_, i) => 
	 net.makeAnd(syncNode, "^k" + k, i)));

   for (let k = 0; k < kLength; k++) {
      connectToList(unions[k], kMatrix[k], connMode.K);
      for (let n = 0; n < cLength; n++) {
	 connectToList(mins[n][k], kMatrix[k], connMode.K);
      }
   }

   return { mins, unions, kMatrix };
}

/*---------------------------------------------------------------------*/
/*    makeForkCircuit ...                                              */
/*    -------------------------------------------------------------    */
/*    Fig 11.10, page 122, rules page 152                              */
/*---------------------------------------------------------------------*/
function makeForkCircuit_int(env, astNode, childCircuits) {
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode);
   const kLength = astNode.trapDepth + 2;
   const rLevel = childCircuits[0].astNode.depth;

   // assert
   for (let i = 0; i < childCircuits.length; i++) {
      if (childCircuits[i].astNode.depth !== rLevel) {
	 throw new Error("Bad children reincarnation levels.");
      }
   }
   
   // c.GO <- GO
   childCircuits.forEach(c => connectToList(goList, c.goList, connMode.GO));
  
   // c.RES <- RES
   childCircuits.forEach(c => c.res && connectTo(res, c.res));

   // c.SUSP <- SUSP
   childCircuits.forEach(c => c.susp && connectTo(susp, c.susp));

   // c.KILL <- KILL
   const orKillList = Array.from({length: l + 1}, (_, i) =>
      net.makeOr(astNode, "Vkill", i));
   connectToList(killList, orKillList, connMode.GO);
   
   childCircuits.forEach(c => {
      connectToList(orKillList, c.killList, connMode.GO);
   });
   
   // SEL <- V c.SEL
   const or_sel = net.makeOr(astNode, "lsel v rsel");
   childCircuits.forEach(c => connectTo(c.sel, or_sel));
   connectTo(or_sel, sel);

   // build and connect the synchronizer
   const sync = makeSynchronizer(astNode, childCircuits.length, rLevel);

   // Union K of children
   childCircuits.forEach(c => {
      for (let k = 0; k < kLength; k++) {
	 connectToList(c.kMatrix[k], sync.unions[k], connMode.K);
      }
   });

   // Min of children
   childCircuits.forEach((c, n, _) => {
      const cmin = sync.mins[n];

      // connect OR-NOT door with GO of parallel and SEL of child
      const xem = net.makeOr(astNode, "xem[" + n + "]", l, 0);

      // xMIN[0,l'] <= !(SEL v GO[l])
      connectTo(goList[l], xem);
      connectTo(c.sel, xem);
      connectTo(xem, cmin[0][l], net.FAN.NEG);

      // connect all incarnations of K0 of child
      connectToList(c.kMatrix[0], cmin[0], connMode.K);

      // connect all incarnations of child min Kn-1 to child min Kn
      for (let k = 0; k < kLength - 1; k++) {
	 for (let i = 0; i <= l; i++) {
	    connectTo(cmin[k][i], cmin[k + 1][i]);
	    if ((c.kMatrix.length > k + 1) && c.kMatrix[k + 1].length > i) {
	       connectTo(c.kMatrix[k + 1][i], cmin[k + 1][i]);
	    }
	 }
      }
   });

   // Connect K to KILL
   for (let k = 2; k < sync.unions.length; k++) {
      const l = orKillList.length;
      for (let i = 0; i < sync.unions[k].length; i++) {
	 connectTo(sync.unions[k][i], orKillList[i < l ? i : l - 1]);
      }
   }

   // connect the synchronizer to the cicruit kMatrix
   sync.kMatrix.forEach((m, k, _) =>
      connectToList(m, kMatrix[k], connMode.K));

   return new Circuit(astNode,
		      // --
		      goList,   // GO
		      res,      // RES
		      susp,     // SUSP
    		      killList, // KILL
		      // --
		      sel,      // SEL
		      kMatrix); // K
}

function makeForkCircuit_new(env, astNode, childCircuits) {
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode);
   const kLength = astNode.trapDepth + 2;
   // if the FORK is in a loop, rLevel == l + 1, otherwise rLevel == l
   const rLevel = childCircuits[0].astNode.depth;
   let orKillList = [];

   // c.GO <- GO
   childCircuits.forEach(c => connectToList(goList, c.goList, connMode.GO));

   // c.RES <- RES
   childCircuits.forEach(c => connectTo(res, c.res));

   // c.SUSP <- SUSP
   childCircuits.forEach(c => connectTo(susp, c.susp));

   // c.KILL <- KILL
   if (kLength > 2) {
      orKillList = Array.from({length: l + 1}, (_, i) =>
	 net.makeOr(astNode, "Vkill", i));
      connectToList(killList, orKillList, connMode.GO);
  
      childCircuits.forEach(c =>
	 connectToList(orKillList, c.killList, connMode.GO));
   } else {
      childCircuits.forEach(c =>
	 connectToList(killList, c.killList, connMode.GO));
   }
   
   // SEL <- V c.SEL
   const or_sel = net.makeOr(astNode, "lsel v rsel");
   childCircuits.forEach(c => connectTo(c.sel, or_sel));
   connectTo(or_sel, sel);

   // build and connect the synchronizer
   const sync = makeSynchronizer(astNode, childCircuits.length, rLevel);
   
   // Union K of children
   childCircuits.forEach(c => {
      for (let k = 0; k < kLength; k++) {
	 connectToList(c.kMatrix[k], sync.unions[k], connMode.K);
      }
   });
   
   // Min of children
   childCircuits.forEach((c, n, _) => {
      const cmin = sync.mins[n];
      
      // DO NOT CONNECT OR-NOT door with GO of parallel and SEL of child
      // Instead, use a variant of Fig 11.10 suggested by Gerard:
      // do not connect to GO wire to the synchronizer
      //	 connectTo(c.sel, cmin[0][l], net.FAN.NEG);
      const xem = net.makeAnd(astNode, "xem[" + n + "]", l, 0);
      
      connectTo(res, xem);
      connectTo(c.sel, xem, net.FAN.NEG);
      connectTo(sel, xem);
      
      connectTo(xem, cmin[0][l], net.FAN.STD);
      
      // connect all incarnations of K0 of child
      connectToList(c.kMatrix[0], cmin[0], connMode.K);
      
      // connect all incarnations of child min Kn-1 to child min Kn
      for (let k = 0; k < kLength - 1; k++) {
	 for (let i = 0; i <= l; i++) {
	    connectTo(cmin[k][i], cmin[k + 1][i]);
	    if ((c.kMatrix.length > k + 1) && c.kMatrix[k + 1].length > i) {
	       connectTo(c.kMatrix[k + 1][i], cmin[k + 1][i]);
	    }
	 }
      }
   });
   
   // ----------------------------------------------------------------------
   // !!! MS 20 Nov 2025 !!!
   // ----------------------------------------------------------------------
   // Until commit 3da5942 the k of the children where connected to the kill
   // of these same children. These connections are not described in 
   // Fig 11.10 and seem to have to reason. The new compiler no longer
   // makes these connections but the code remains here in case the
   // decision not to connect the c.k to the c.kill has to be reverted
   if (astNode.machine.forkOrKill) {
      // connect K to KILL
      for (let k = 2; k < sync.unions.length; k++) {
	 const l = orKillList.length;
	 for (let i = l - 1; i >= 0; i--) {
	    connectTo(sync.unions[k][i], orKillList[i]);
	 }
	 
	 if (sync.unions[k].length > l) {
	    connectTo(sync.unions[k][sync.unions[k].length - 1], orKillList[l - 1]);
	 }
      }
   }
   // ----------------------------------------------------------------------
   
   // connect the synchronizer to the cicruit kMatrix
   sync.kMatrix.forEach((m, k, _) =>
      connectToList(m, kMatrix[k], connMode.K));
     
   return assertCircuitInterfaceConnections(
      new Circuit(astNode,
		  // --
		  goList,    // GO
		  res,       // RES
		  susp,      // SUSP
		  killList,  // KILL
		  // --
		  sel,       // SEL
		  kMatrix)); // K
}

function makeForkCircuit(env, astNode, childCircuits) {
   switch (compiler(astNode)) {
      case "new": return makeForkCircuit_new(env, astNode, childCircuits);
      default: return makeForkCircuit_int(env, astNode, childCircuits);
   }
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Trap ...                                           */
/*---------------------------------------------------------------------*/
ast.Trap.prototype.makeCircuit = function(env, sigtable) {
   traceEnter(traceNode(this), "...");

   const cc0 = this.children[0].makeCircuit(env, sigtable);
   this.circuit = makeTrapCircuit(env, this, cc0);
   linkDynamicNode(this);

   traceExit(traceNode(this));

   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeTrapCircuit ...                                              */
/*    -------------------------------------------------------------    */
/*    Fig 11.12, page 124, rules page 153                              */
/*---------------------------------------------------------------------*/
function makeTrapCircuit_int(env, astNode, childCircuit) {
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode);

   if (childCircuit.kMatrix.length <= 2) {
      return childCircuit;
   } else {
      // c.GO <- GO
      connectToList(goList, childCircuit.goList, connMode.GO);

      // c.RES <- RES
      connectTo(res, childCircuit.res);

      // c.SUSP <- SUSP
      connectTo(susp, childCircuit.susp);

      // c.KILL <- KILL
      connectToList(killList, childCircuit.killList, connMode.GO);

      // SEL <- c.SEL
      connectTo(childCircuit.sel, sel);

      // K0 <- c.K0 V c.K2
      const k0_or_k2 = Array.from({length: l + 1}, (_, i) =>
	 net.makeOr(astNode, "k0 v k2", i));

      connectToList(childCircuit.kMatrix[0], k0_or_k2, connMode.KK);
      connectToList(childCircuit.kMatrix[2], k0_or_k2, connMode.KK);
      connectToList(k0_or_k2, kMatrix[0], connMode.KK);
      
      // K1 < c.K1
      connectToList(childCircuit.kMatrix[1], kMatrix[1], connMode.K);
      
      // Ki < c.Ki-1
      for (let k = 2; k < astNode.trapDepth + 2; k++) {
	 connectToList(childCircuit.kMatrix[k + 1], kMatrix[k], connMode.K);
      }

      return assertCircuitInterfaceConnections(
	 new Circuit(astNode,
		     // --
		     goList,     // GO
		     res,        // RES
		     susp,       // SUSP
		     killList,   // KILL
		     // --
		     sel,        // SEL
		     kMatrix));  // K
   }
}

function makeTrapCircuit_new(env, astNode, childCircuit) {
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode);

   if (childCircuit.kMatrix.length <= 2) {
      return childCircuit;
   } else {
      // c.GO <- GO
      connectToList(goList, childCircuit.goList, connMode.GO);

      // c.RES <- RES
      connectTo(res, childCircuit.res);

      // c.SUSP <- SUSP
      connectTo(susp, childCircuit.susp);

      // c.KILL <- KILL v c.K2
      // MS22feb2025, I think this rule is wrong, it should be c.KILL <- KILL
      // Otherwise, the following program would executed only at the first
      // instant
      // LOOP { T1: { yield; break T1; } }

      const suspicious_k2_kill_connection = true;
      if (suspicious_k2_kill_connection) {
	 const kill_or_k2 = Array.from({length: l + 1}, (_, i) =>
            net.makeOr(astNode, "kill v k2", i));

	 connectToList(killList, kill_or_k2, connMode.GO);
	 connectToList(childCircuit.kMatrix[2], kill_or_k2, connMode.K);
	 connectToList(kill_or_k2, childCircuit.killList, connMode.GO);
      } else {
	 connectToList(killList, childCircuit.killList, connMode.GO);
      }

      // SEL <- c.SEL
      connectTo(childCircuit.sel, sel);

      // K0 <- c.K0 V c.K2
      const k0_or_k2 = Array.from({length: l + 1}, (_, i) =>
	 net.makeOr(astNode, "k0 v k2", i));

      if (childCircuit.kMatrix[0].length > 0) {
	 connectToList(childCircuit.kMatrix[0], k0_or_k2, connMode.KK);
      }
      if (childCircuit.kMatrix[2].length > 0) {
	 connectToList(childCircuit.kMatrix[2], k0_or_k2, connMode.KK);
      }
      connectToList(k0_or_k2, kMatrix[0], connMode.KK);
      
      // K1 < c.K1
      connectToList(childCircuit.kMatrix[1], kMatrix[1], connMode.K);
      
      // Ki < c.Ki-1
      for (let k = 2; k < astNode.trapDepth + 2; k++) {
	 connectToList(childCircuit.kMatrix[k + 1], kMatrix[k], connMode.K);
      }

      return assertCircuitInterfaceConnections(
	 new Circuit(astNode,
		     // --
		     goList,     // GO
		     res,        // RES
		     susp,       // SUSP
		     killList,   // KILL
		     // --
		     sel,        // SEL
		     kMatrix));  // K
   }
}

function makeTrapCircuit(env, astNode, childCircuit) {
   switch (compiler(astNode)) {
      case "new" : return makeTrapCircuit_new(env, astNode, childCircuit);
      default: return makeTrapCircuit_int(env, astNode, childCircuit);
   }
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Exit ...                                           */
/*---------------------------------------------------------------------*/
ast.Exit.prototype.makeCircuit = function(env, sigtable) {
   traceEnter(traceNode(this), "...");

   this.circuit = makeExitCircuit(env, this);
   linkDynamicNode(this);
   
   traceExit(traceNode(this));

   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeExitCircuit ...                                              */
/*    -------------------------------------------------------------    */
/*    Fig 11.2, page 115                                               */
/*---------------------------------------------------------------------*/
function makeExitCircuit(env, astNode) {
   // circuits common interface
   const retcode = astNode.returnCode;
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode);

   connectToList(goList, kMatrix[retcode], connMode.GO);
   connectTo(net.makeOr(astNode, "const.0", 0), sel);
   
   return new Circuit(astNode,
		      // --
		      goList,    // GO
		      res,       // RES
		      susp,      // SUSP
		      killList,  // KILL
		      // --
		      sel,       // SEL
		      kMatrix);  // K
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Sequence ...                                       */
/*---------------------------------------------------------------------*/
ast.Sequence.prototype.makeCircuit = function(env, sigtable) {
   traceEnter(traceNode(this), "...");

   const ccs = this.children.map((c, i, arr) => c.makeCircuit(env, sigtable));

   this.circuit = makeSequenceCircuit(env, this, ccs);
   linkDynamicNode(this);

   traceExit(traceNode(this));

   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeSequenceCircuit ...                                          */
/*    -------------------------------------------------------------    */
/*    Fig. 11.8, page 120 and rules page 150                           */
/*---------------------------------------------------------------------*/
function makeSequenceCircuit_int(env, astNode, childCircuits) {
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode);
   const len = childCircuits.length;

   // c[0].GO <- GO
   connectToList(goList, childCircuits[0].goList, connMode.GO);
   
   // direct children connections
   childCircuits.forEach(c => {
      // c.RES <- RES
      connectTo(res, c.res);
      // c.SUSP <- SUSP
      connectTo(susp, c.susp);
      // c.KILL <- KILL
      connectToList(killList, c.killList, connMode.GO);
   });

   // SEL <- V c.sel
   const orSel = net.makeOr(astNode, "ORsel");
   connectTo(orSel, sel);
   childCircuits.forEach(c => connectTo(c.sel, orSel));
   
   // connect each KO incarnation of child[N] to each GO
   // incarnation of child[N + 1]
   for (let i = 0; i < len - 1; i++) {
      const cur = childCircuits[i];
      const next = childCircuits[i + 1];
      connectToList(cur.kMatrix[0], next.goList, connMode.KGO);
   }
   
   // get K0 of last child
   if (childCircuits[len - 1].kMatrix[0]) {
      connectToList(childCircuits[len - 1].kMatrix[0], kMatrix[0], connMode.KGO);
   }

   // kn, n > 0 connections
   for (let k = 1; k < kMatrix.length; k++) {
      const kk_list = Array.from({length: l + 1}, (_, i) =>
	 net.makeOr(astNode, `or_k${k}/${i}`, i));

      childCircuits.forEach(c => {
	 if (c.kMatrix.length > k && c.kMatrix[k] && c.kMatrix[k].length > 0) {
	    connectToList(c.kMatrix[k], kk_list, connMode.K);
	 }
      });

      connectToList(kk_list, kMatrix[k], connMode.K);
   }

   return new Circuit(astNode,
		      // --
		      goList,   // GO
		      res,      // RES 
		      susp,     // SUSP
		      killList, // KILL
		      // --
		      sel,      // SEL
		      kMatrix); // K
}

function makeSequenceCircuit_new(env, astNode, childCircuits) {
   // circuits common interface
   const kmaxlen =
      Math.max.apply(undefined, childCircuits.map(c => c.kMatrix.length));
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode);
   const len = childCircuits.length;

   // debug assertion
   if (assert) childCircuits.forEach(assertCircuitInterface);

   // c[0].GO <- GO
   connectToList(goList, childCircuits[0].goList, connMode.GO);
   
   // direct children connections
   childCircuits.forEach(c => {
      // c.RES <- RES
      connectTo(res, c.res);
      // c.SUSP <- SUSP
      connectTo(susp, c.susp);
      // c.KILL <- KILL
      connectToList(killList, c.killList, connMode.GO);
   });

   // SEL <- V c.SEL
   const orSel = net.makeOr(astNode, "ORsel");
   connectTo(orSel, sel);
   childCircuits.forEach(c => connectTo(c.sel, orSel));

   // connect each KO incarnation of child[N] to each GO
   // incarnation of child[N + 1]
   for (let i = 0; i < len - 1; i++) {
      const cur = childCircuits[i];
      const next = childCircuits[i + 1];
      connectToList(cur.kMatrix[0], next.goList, connMode.K);
   }
   
   // get K0 of last child
   connectToList(childCircuits[len - 1].kMatrix[0], kMatrix[0], connMode.K);

   // kn, n > 0 connections
   for (let k = 1; k < kMatrix.length; k++) {
      const kk_list = Array.from({length: l + 1}, (_, i) =>
	 net.makeOr(astNode, `or_k${k}/${i}`, i));

      childCircuits.forEach(c => {
	 if (c.kMatrix.length > k) {
	    connectToList(c.kMatrix[k], kk_list, connMode.K);
	 }
      });

      connectToList(kk_list, kMatrix[k], connMode.K);
   }
			    
   return assertCircuitInterfaceConnections(
      new Circuit(astNode,
		  // --
		  goList,     // GO
		  res,        // RES
		  susp,       // SUSP
		  killList,   // KILL
		  // --
		  sel,        // SEL
		  kMatrix));  // K
}

function makeSequenceCircuit(env, astNode, childCircuits) {
   switch (compiler(astNode)) {
      case "new": return makeSequenceCircuit_new(env, astNode, childCircuits);
      default: return makeSequenceCircuit_int(env, astNode, childCircuits);
   }
}
 
/*---------------------------------------------------------------------*/
/*    makeCircuit ::Pause ...                                          */
/*---------------------------------------------------------------------*/
ast.Pause.prototype.makeCircuit = function(env, sigtable) {
   traceEnter(traceNode(this), "...");

   this.circuit = makePauseCircuit(env, this);
   linkDynamicNode(this);
   
   traceExit(traceNode(this));
   
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makePauseCircuit ...                                             */
/*    -------------------------------------------------------------    */
/*    Fig 11.3, page 115 and Rules page 149                            */
/*---------------------------------------------------------------------*/
function makePauseCircuit(env, astNode) {
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode);

   const reg = new net.RegisterNet(astNode, "reg", 0);
   const reglhs = net.makeAnd(astNode, "sus^reg^!kill");
   const regrhs = net.makeOr(astNode, "V(go^!kill)");

   // debug
   if (debugTrace || debugTraceCircuit.indexOf(astNode.ctor) >= 0) {
      reg.setDebugTrace();
   }
   
   // reglhs = (SUS ^ REG ^ !KILL[l])
   connectTo(susp, reglhs);
   connectTo(reg, reglhs);
   connectTo(killList[l], reglhs, net.FAN.NEG);

   // regrhs = V (GO[i] ^ !KILL[i])
   for (let i = 0; i <= l; i++) {
      // GO[i] ^ !KILL[i]
      const and = net.makeAnd(astNode, "go^!kill", i);
      connectTo(goList[i], and);
      connectTo(killList[i], and, net.FAN.NEG);
      connectTo(and, regrhs);
   }

   // REG := reglhs v regrhs
   const or = net.makeOr(astNode, "(sus^reg V(go^!kill)")
   connectTo(reglhs, or);
   connectTo(regrhs, or);
   connectTo(or, reg);

   // SEL <= REG
   connectTo(reg, sel);

   // K[1, i] <= GO[i]
   connectToList(goList, kMatrix[1], connMode.K);
   
   // K[0,l] <= REG ^ RES
   const res_and_reg = net.makeAnd(astNode, "res^reg", l);
   connectTo(reg, res_and_reg);
   connectTo(res, res_and_reg);
   connectTo(res_and_reg, kMatrix[0][l]);

   return new Circuit(astNode,
		      // --
		      goList,    // GO
		      res,       // RES
		      susp,      // SUSP
		      killList,  // KILL
		      // --
		      sel,       // SEL
		      kMatrix);  // K
}

/*---------------------------------------------------------------------*/
/*    makeAwaitCircuit ...                                             */
/*---------------------------------------------------------------------*/
function makeAwaitCircuit(env, astNode) {
   const chalt = makeHaltCircuit(env, astNode);
   return makeAbortCircuit(env, astNode, chalt, false);
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Await ...                                          */
/*---------------------------------------------------------------------*/
ast.Await.prototype.makeCircuit = function(env, sigtable) {
   traceEnter(traceNode(this), "...");
   
   this.circuit = makeAwaitCircuit(env, this);
   
   traceExit(traceNode(this));
   
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeLoopeachCircuit ...                                          */
/*---------------------------------------------------------------------*/
function makeLoopeachCircuit(env, astNode, childCircuit) {
   const halt = makeHaltCircuit(env, astNode);
   const seq = makeSequenceCircuit(env, astNode, [childCircuit, halt])
   const abort = makeAbortCircuit(env, astNode, seq, true);

   return makeLoopCircuit(env, astNode, abort);
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Every ...                                          */
/*---------------------------------------------------------------------*/
ast.Every.prototype.makeCircuit = function(env, sigtable) {
   traceEnter(traceNode(this), "...");

   const cc0 = this.children[0].makeCircuit(env, sigtable);
   const cloopeach = makeLoopeachCircuit(env, this, cc0);
   const cawait = makeAwaitCircuit(env, this);
   this.circuit = makeSequenceCircuit(env, this, [cawait, cloopeach]);
   linkDynamicNode(this);
   
   traceExit(traceNode(this));
   
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::LoopEach ...                                       */
/*---------------------------------------------------------------------*/
ast.LoopEach.prototype.makeCircuit = function(env, sigtable) {
   traceEnter(traceNode(this), "...");
   
   const cc0 = this.children[0].makeCircuit(env, sigtable);
   this.circuit = makeLoopeachCircuit(env, this, cc0);
   linkDynamicNode(this);
   traceExit(traceNode(this));

   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Loop ...                                           */
/*---------------------------------------------------------------------*/
ast.Loop.prototype.makeCircuit = function(env, sigtable) {
   traceEnter(traceNode(this), "...");
   
   const cc0 = this.children[0].makeCircuit(env, sigtable);
   this.circuit = makeLoopCircuit(env, this, cc0);
   linkDynamicNode(this);
   
   traceExit(traceNode(this));

   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeLoopCircuit ...                                              */
/*    -------------------------------------------------------------    */
/*    Fig 11.9, page 121 and rules page 151                            */
/*---------------------------------------------------------------------*/
function makeLoopCircuit_int(env, astNode, childCircuit) {
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode);
   const l2 = childCircuit.astNode.depth;

   // Error on instantaneous loop, and connect K0[depth2] on K0[depth1]
   for (let l = 0; l < l2; l++) {
      if (childCircuit.kMatrix[0].length > l) {
	 connectTo(
	    childCircuit.kMatrix[0][l],
	    new net.ActionNet(astNode, "error", l,
			      function() {
				 throw error.TypeError("Instantaneous loop.", astNode.loc) },
			      []));
      }
   }

   // c.GO[n] < GO[n], for n < l
   for (let i = 0; i < l; i++) {
      connectTo(goList[i], childCircuit.goList[i]);
   }
   
   // c.GO[l] <- GO v c.k0[l]
   const go_or_k0 = net.makeOr(astNode, "go v k0", l2); 
   connectTo(goList[l], go_or_k0);
   connectTo(childCircuit.kMatrix[0][l2], go_or_k0);
   connectTo(go_or_k0, childCircuit.goList[l]);
   
   // c.RES <- RES
   connectTo(res, childCircuit.res);
   
   // c.SUSP <- c.SUSP
   connectTo(susp, childCircuit.susp);
   
   // c.KILL <- KILL
   connectToList(killList, childCircuit.killList, connMode.GO);
   
   // SEL <- c.SEL
   connectTo(childCircuit.sel, sel);
   
   // K0 <- 0
   const const0 = net.makeOr(astNode, "const.0");
   for (let i = 0; i <= l; i++) {
      connectTo(const0, kMatrix[0][i]);
   }
   
   // Kn <- c.Kn
   for (let k = 1; k < childCircuit.kMatrix.length; k++) {
      connectToList(childCircuit.kMatrix[k], kMatrix[k], connMode.K);
   }
   
   return assertCircuitInterfaceConnections(
      new Circuit(astNode,
		  // --
		  goList,     // GO
		  res,        // RES
		  susp,       // SUSP
		  killList,   // KILL
		  // --
		  sel,        // SEL
		  kMatrix));  // K
}


function makeLoopCircuit_new(env, astNode, childCircuit) {
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode);
   const l2 = childCircuit.astNode.depth;

   // Error on instantaneous loop, and connect K0[depth2] on K0[depth1]
   if (!astNode.machine.loopSafe) {
      for (let l = 0; l < l2; l++) {
	 if (childCircuit.kMatrix[0].length > l) {
	    connectTo(
	       childCircuit.kMatrix[0][l],
	       new net.ActionNet(astNode, "error", l,
				 function() {
				    throw error.TypeError("Instantaneous loop.", astNode.loc) },
				 []));
	 }
      }
   }

   // c.GO[n] < GO[n], for n < l
   for (let i = 0; i < l; i++) {
      connectTo(goList[i], childCircuit.goList[i]);
   }
   
   // c.GO[l] <- GO v c.k0[l]
   const go_or_k0 = net.makeOr(astNode, "go v k0", l2); 
   connectTo(goList[l], go_or_k0);
   connectTo(childCircuit.kMatrix[0][l2], go_or_k0);
   connectTo(go_or_k0, childCircuit.goList[l]);
   
   // c.RES <- RES
   connectTo(res, childCircuit.res);
   
   // c.SUSP <- c.SUSP
   connectTo(susp, childCircuit.susp);
   
   // c.KILL <- KILL
   connectToList(killList, childCircuit.killList, connMode.GO);
   
   // SEL <- c.SEL
   connectTo(childCircuit.sel, sel);
   
   // K0 <- 0
   const const0 = net.makeOr(astNode, "const.0");
   for (let i = 0; i <= l; i++) {
      connectTo(const0, kMatrix[0][i]);
   }
   
   // Kn <- c.Kn
   for (let k = 1; k < childCircuit.kMatrix.length; k++) {
      connectToList(childCircuit.kMatrix[k], kMatrix[k], connMode.K);
   }
   
   return assertCircuitInterfaceConnections(
      new Circuit(astNode,
		  // --
		  goList,     // GO
		  res,        // RES
		  susp,       // SUSP
		  killList,   // KILL
		  // --
		  sel,        // SEL
		  kMatrix));  // K
}



function dup(env, from, to) {
   let o;

   if (from instanceof net.RegisterNet) {
      return from;
   } else if (o = env.get(from.id)) {
      return o;
   } else {
      let n = from.dup();
      env.set(from.id, n);
      
      if (from !== to) {
	 from.faninList.forEach(f => {
	    const a = dup(env, f.net, to);

	    if (!f.polarity) {
	       n = connectToWire(a, n, net.FAN.NEG);
	    } else if (f.dependency) {
	       n = connectToWire(a, n, net.FAN.DEP);
	    } else {
	       n = connectToWire(a, n, net.FAN.STD);
	    }
	    env.set(from.id, n);
	 });
      }
      return n;
   }
}

function makeLoopCircuit_dup(env, astNode, childCircuit) {
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode);
   const l2 = childCircuit.astNode.depth;
   const const0 = net.makeOr(astNode, "const.0");

   // c.GO[n] < GO[n], for n < l
   for (let i = 0; i < l; i++) {
      connectTo(goList[i], childCircuit.goList[i]);
   }
   
   // circuit duplication
   // MS 15feb2025, should govtk0 be defined at level -
   const netenv = new Map();
   const cgo = childCircuit.goList[0];
   const ck0 = childCircuit.kMatrix[0][0];
   const nk0 = dup(netenv, ck0, cgo);
   const ngo = netenv.get(cgo.id);

   if (ngo) {
      // the GO wire has been reached so a real duplication is needed
      const go_or_k0 = net.makeOr(astNode, "go_or_k0", l2);

      connectTo(goList[0], go_or_k0);
      
      connectTo(go_or_k0, cgo);
      connectTo(const0, go_or_k0);
      connectTo(go_or_k0, ngo);
      connectToWire(nk0, go_or_k0, net.FAN.STD);
   } else {
      // the GO wire has not been reached, don't copy
      const go_or_k0 = net.makeOr(astNode, "go_or_k0", l2);
      
      connectTo(goList[l], go_or_k0);
      connectTo(childCircuit.kMatrix[0][l2], go_or_k0);
      connectTo(go_or_k0, childCircuit.goList[l]);
   }
   
   // c.RES <- RES
   connectTo(res, childCircuit.res);
   
   // c.SUSP <- c.SUSP
   connectTo(susp, childCircuit.susp);
   
   // c.KILL <- KILL
   connectToList(killList, childCircuit.killList, connMode.GO);
   
   // SEL <- c.SEL
   connectTo(childCircuit.sel, sel);
   
   // K0 <- 0
   for (let i = 0; i <= l; i++) {
      connectTo(const0, kMatrix[0][i]);
   }
   
   // Kn <- c.Kn
   for (let k = 1; k < childCircuit.kMatrix.length; k++) {
      connectToList(childCircuit.kMatrix[k], kMatrix[k], connMode.K);
   }
   
   // instantaenous check (GO xor k0)
   if (l === 0) {
      const err = new net.ActionNet(astNode, "error", 0,
				    function() {
				       throw error.TypeError("Instantaneous loop.", astNode.loc) },
				    []);
   }
      
   return assertCircuitInterfaceConnections(
      new Circuit(astNode,
		  // --
		  goList,     // GO
		  res,        // RES
		  susp,       // SUSP
		  killList,   // KILL
		  // --
		  sel,        // SEL
		  kMatrix));  // K
}

function makeLoopCircuit(env, astNode, childCircuit) {
   if (astNode.machine.loopDup) {
      return makeLoopCircuit_dup(env, astNode, childCircuit);
   } else if (compiler(astNode) === "new") {
      return makeLoopCircuit_new(env, astNode, childCircuit);
   } else {
      return makeLoopCircuit_int(env, astNode, childCircuit);
   }
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Nothing ...                                        */
/*    -------------------------------------------------------------    */
/*    Fig 11.2, page 115, rules page 150                               */
/*---------------------------------------------------------------------*/
ast.Nothing.prototype.makeCircuit = function(env, sigtable) {
   traceEnter(traceNode(this), "...");
   
   this.circuit = makeNothingCircuit(env, this);
   linkDynamicNode(this);
   
   traceExit(traceNode(this));
   
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeNothingCircuit ...                                           */
/*---------------------------------------------------------------------*/
function makeNothingCircuit(env, astNode) {
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode);
   const const0 = net.makeOr(astNode, "const0", 0);
   
   connectToList(goList, kMatrix[0], connMode.GO);
   connectTo(const0, sel);
   
   for (let k = 1; k < kMatrix.length; k++) {
      for (let i = 0; i <= l; i++) {
	 connectTo(const0, kMatrix[k][i]);
      }
   }

   return new Circuit(astNode,
		      // --
		      goList,    // GO
		      res,       // RES
		      susp,      // SUSP
		      killList,  // KILL
		      // --
		      sel,       // SEL
		      kMatrix);  // K
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Atom ...                                           */
/*---------------------------------------------------------------------*/
ast.Atom.prototype.makeCircuit = function(env, sigtable) {
   traceEnter(traceNode(this), "...");

   this.circuit = makeAtomCircuit(env, this);
   linkDynamicNode(this);
   
   traceExit(traceNode(this));
   
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeAtomCircuit ...                                              */
/*---------------------------------------------------------------------*/
function makeAtomCircuit(env, astNode) {
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode);
   const atomFunc = astNode.func;
   const frame = astNode.frame;
   const func = frame ? function() { atomFunc(frame) } : atomFunc;
   const const0 = net.makeOr(astNode, "const.0", 0);
   
   for (let i = 0; i <= l; i++) {
      bindSigAccessorList(env, astNode.accessor_list, astNode);

      const actionNet =
	 new net.ActionNet(astNode, "action", i, func, astNode.accessor_list);

      connectTo(goList[i], actionNet);
      connectTo(actionNet, kMatrix[0][i]);
      connectTo(const0, kMatrix[1][i]);
   }

   connectTo(const0, sel);
   
   return new Circuit(astNode,
		      // --
		      goList,    // GO
		      res,       // RES
		      susp,      // SUSP
		      killList,  // KILL
		      // --
		      sel,       // SEL
		      kMatrix);  // K
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Suspend ...                                        */
/*---------------------------------------------------------------------*/
ast.Suspend.prototype.makeCircuit = function(env, sigtable) {
   traceEnter(traceNode(this), "...");
   
   const cc0 = this.children[0].makeCircuit(env, sigtable);
   this.circuit = makeSuspendCircuit(env, this, cc0);
   linkDynamicNode(this);

   traceExit(traceNode(this));

   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeSuspendCircuit ...                                           */
/*    -------------------------------------------------------------    */
/*    Fig 11.6, page 119, rules page 150                               */
/*---------------------------------------------------------------------*/
function makeSuspendCircuit(env, astNode, childCircuit) {
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode);
   
   const s = makeExpressionNet(env, astNode, l);
   const res_and_sel = net.makeAnd(astNode, "res_and_sel");
   const res_and_sel_and_s = net.makeAnd(astNode, "res_and_sel_and_s");
   const res_and_sel_and_not_s = net.makeAnd(astNode, "res_and_sel_and_not_s");

   // res_and_sel
   connectTo(res, res_and_sel);
   connectTo(childCircuit.sel, res_and_sel);

   // res_and_sel_and_s
   connectTo(res_and_sel, res_and_sel_and_s);
   connectTo(s, res_and_sel_and_s);

   if (!(astNode.func instanceof ast.$Delay)) {
      // see makeIfCircuit
      connectTo(res_and_sel, s);
   }

   // res_and_sel_and_not_s
   connectTo(res_and_sel, res_and_sel_and_not_s);
   connectTo(s, res_and_sel_and_not_s, net.FAN.NEG);
   
   // c.GO <- GO
   connectToList(goList, childCircuit.goList, connMode.GO);

   // c.RES <- !s ^ RES ^ c.SEL
   connectTo(res_and_sel_and_not_s, childCircuit.res);
   
   // c,SUSP <- SUSP v (s ^ RES ^ c.SEL)
   const c_susp = net.makeOr(astNode, "susp");
   connectTo(susp, c_susp);
   connectTo(res_and_sel_and_s, c_susp);
   connectTo(c_susp, childCircuit.susp);
   
   // c,KILL <- KILL
   connectToList(killList, childCircuit.killList, connMode.GO);

   // SEL <- c.SEL
   connectTo(childCircuit.sel, sel);
   
   // K0 <- c.K0
   connectToList(childCircuit.kMatrix[0], kMatrix[0], connMode.K);

   // k1 <- c.K1 v s ^ RES ^ c.SEL
   const k1l = net.makeOr(astNode, `k1/${l}`);
   for (let i = 0; i < l; i++) {
      connectTo(childCircuit.kMatrix[1][i], kMatrix[1][i]);
   }
   connectTo(res_and_sel_and_s, k1l);
   connectTo(childCircuit.kMatrix[1][l], k1l);
   connectTo(k1l, kMatrix[1][l]);

   // Kn <- c.Kn, n >= 2
   for (let k = 2; k < childCircuit.kMatrix.length; k++) {
      connectToList(childCircuit.kMatrix[k], kMatrix[k], connMode.K);
   }
   
   return assertCircuitInterfaceConnections(
	 new Circuit(astNode,
		     // --
		     goList,     // GO
		     res,        // RES
		     susp,       // SUSP
		     killList,   // KILL
		     // --
		     sel,        // SEL
		     kMatrix));  // K
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::WeakAbort ...                                      */
/*---------------------------------------------------------------------*/
ast.WeakAbort.prototype.makeCircuit = function(env, sigtable) {
   this.circuit = this.children[0].makeCircuit(env, sigtable);

   linkDynamicNode(this);
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Abort ...                                          */
/*---------------------------------------------------------------------*/
ast.Abort.prototype.makeCircuit = function(env, sigtable) {
   traceEnter(traceNode(this), "...");

   const cc = this.children[0].makeCircuit(env, sigtable);
   this.circuit = makeAbortCircuit(env, this, cc, false);
   linkDynamicNode(this);
   
   traceExit(traceNode(this));
   
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeAbortNonImmediateCircuit ...                                 */
/*    -------------------------------------------------------------    */
/*    Fig 11.7, page 120 and Rules page 150                            */
/*---------------------------------------------------------------------*/
function makeAbortNonImmediateCircuit_int(env, astNode, childCircuit) {
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode);
   const res_and_sel = net.makeAnd(astNode, "res^sel");
   let s;

   // there will be several connections to k0/l so make it an or gate
   // instead of a single fanin wire
   kMatrix[0][l] = net.makeOr(astNode, `k0/${l}`, l);

   // debug assertion
   if (assert) assertCircuitInterface(childCircuit);
   
   if (astNode instanceof ast.Exec) {
      s = astNode.exec_status.callback_wire;
   } else if (astNode.func_count) {
      // counter test expression
      // when a counter must be created, AND and AND-not gates must be
      // connected only on the counter output (and not on expr test)
      const e = makeExpressionNet(env, astNode, l);
      if (!(astNode.func instanceof ast.$Delay)) {
	 // see makeIfCircuit
	 connectTo(res_and_sel, e);
      }
      
      const { cnt, reset } = makeCounterNet(env, astNode);
      goList.forEach(n => connectTo(n, reset));
      connectTo(e, cnt);
      connectTo(res_and_sel, cnt);
      s = cnt;
   } else {
      // regular test expression
      s = makeExpressionNet(env, astNode, l);
      if (!(astNode.func instanceof ast.$Delay)) {
	 // see makeIfCircuit
	 connectTo(res_and_sel, s);
      }
   }
   
   connectTo(res, res_and_sel);

   connectTo(childCircuit.sel, res_and_sel);
   connectTo(childCircuit.sel, sel);
   
   // NRES = RES ^ !S[l(s)]
   const res_and_sel_and_not_s = net.makeAnd(astNode, "res^sel^!s");
   connectTo(res_and_sel, res_and_sel_and_not_s);
   connectTo(s, res_and_sel_and_not_s, net.FAN.NEG);

   connectTo(res_and_sel_and_not_s, childCircuit.res);
   
   // K[0,l] <= RES ^ S[l(s)]
   const res_and_sel_and_s = net.makeAnd(astNode, "res^sel^s");
   const res_and_sel_and_s_or_k0 = net.makeOr(astNode, "res^sel^svk0");
   connectTo(res_and_sel, res_and_sel_and_s);
   connectTo(s, res_and_sel_and_s);

   connectTo(res_and_sel_and_s, res_and_sel_and_s_or_k0);
   connectTo(childCircuit.kMatrix[0][l], res_and_sel_and_s_or_k0);
   connectTo(res_and_sel_and_s_or_k0, kMatrix[0][l]);
   
   // direct connections from the parent to the child circuit
   connectToList(goList, childCircuit.goList, connMode.GO);
   connectToList(killList, childCircuit.killList, connMode.GO);
   connectTo(susp, childCircuit.susp);

   // K0 <- c.K0, for i < l
   if (childCircuit.kMatrix[0].length > 0) {
      connectToList(childCircuit.kMatrix[0], kMatrix[0], connMode.K);
   }

   // kn <- c.Kn
   for (let k = 1; k < childCircuit.kMatrix.length; k++) {
      connectToList(childCircuit.kMatrix[k], kMatrix[k], connMode.K);
   }
   
   return assertCircuitInterfaceConnections(
      new Circuit(astNode,
		  // --
		  goList,    // GO
		  res,       // RES
		  susp,      // SUSP
		  killList,  // KILL
		  // --
		  sel,       // SEL
		  kMatrix)); // K
}

function makeAbortNonImmediateCircuit_new(env, astNode, childCircuit) {
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode);
   const res_and_sel = net.makeAnd(astNode, "res^sel");
   let s;

   // debug assertion
   if (assert) assertCircuitInterface(childCircuit);
   
   if (astNode instanceof ast.Exec) {
      s = astNode.exec_status.callback_wire;
   } else if (astNode.func_count) {
      // counter test expression
      // when a counter must be created, AND and AND-not gates must be
      // connected only on the counter output (and not on expr test)
      const e = makeExpressionNet(env, astNode, l);
      if (!(astNode.func instanceof ast.$Delay)) {
	 // see makeIfCircuit
	 connectTo(res_and_sel, e);
      }
      
      const { cnt, reset } = makeCounterNet(env, astNode);
      goList.forEach(n => connectTo(n, reset));
      connectTo(e, cnt);
      connectTo(res_and_sel, cnt);
      s = cnt;
   } else {
      // regular test expression
      s = makeExpressionNet(env, astNode, l);
      if (!(astNode.func instanceof ast.$Delay)) {
	 // see makeIfCircuit
	 connectTo(res_and_sel, s);
      }
   }
   
   connectTo(res, res_and_sel);

   connectTo(childCircuit.sel, res_and_sel);
   connectTo(childCircuit.sel, sel);
   
   // NRES = RES ^ !S[l(s)]
   const res_and_sel_and_not_s = net.makeAnd(astNode, "res^sel^!s");
   connectTo(res_and_sel, res_and_sel_and_not_s);
   connectTo(s, res_and_sel_and_not_s, net.FAN.NEG);

   connectTo(res_and_sel_and_not_s, childCircuit.res);
   
   // K[0,l] <= RES ^ S[l(s)]
   const res_and_sel_and_s = net.makeAnd(astNode, "res^sel^s");
   const res_and_sel_and_s_or_k0 = net.makeOr(astNode, "res^sel^svk0");
   connectTo(res_and_sel, res_and_sel_and_s);
   connectTo(s, res_and_sel_and_s);

   connectTo(res_and_sel_and_s, res_and_sel_and_s_or_k0);
   connectTo(childCircuit.kMatrix[0][l], res_and_sel_and_s_or_k0);
   
   connectTo(res_and_sel_and_s_or_k0, kMatrix[0][l]);

   // direct connections from the parent to the child circuit
   connectToList(goList, childCircuit.goList, connMode.GO);
   connectToList(killList, childCircuit.killList, connMode.GO);
   connectTo(susp, childCircuit.susp);

   // K0 <- c.K0, for i < l
   for (let i = 0; i < l; i++) {
      connectTo(childCircuit.kMatrix[0][i], kMatrix[0][i]);
   }

   // kn <- c.Kn
   for (let k = 1; k < childCircuit.kMatrix.length; k++) {
      connectToList(childCircuit.kMatrix[k], kMatrix[k], connMode.K);
   }
   
   return assertCircuitInterfaceConnections(
      new Circuit(astNode,
		  // --
		  goList,    // GO
		  res,       // RES
		  susp,      // SUSP
		  killList,  // KILL
		  // --
		  sel,       // SEL
		  kMatrix)); // K
}

function makeAbortNonImmediateCircuit(env, astNode, childCircuit) {
   switch (compiler(astNode)) {
      case "new": return makeAbortNonImmediateCircuit_new(env, astNode, childCircuit);
      default: return makeAbortNonImmediateCircuit_int(env, astNode, childCircuit);
   }
}

/*---------------------------------------------------------------------*/
/*    makeAbortCircuit ...                                             */
/*---------------------------------------------------------------------*/
function makeAbortCircuit(env, astNode, childCircuit, force_non_immediate) {
   if (!force_non_immediate && astNode.immediate) {
      const abortc = makeAbortNonImmediateCircuit(env, astNode, childCircuit);
      const ifc = [ makeNothingCircuit(env, astNode), abortc ];
      
      return makeIfCircuit(env, astNode, ifc);
   } else {
      return makeAbortNonImmediateCircuit(env, astNode, childCircuit);
   }
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Emit ...                                           */
/*---------------------------------------------------------------------*/
ast.Emit.prototype.makeCircuit = function(env, sigtable) {
   traceEnter(traceNode(this), "...");
   
   this.circuit = makeEmitIfCircuit(env, this);
   linkDynamicNode(this);

   traceExit(traceNode(this));
   
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeEmit ...                                                     */
/*    -------------------------------------------------------------    */
/*    Fig 11.4, page 116                                               */
/*---------------------------------------------------------------------*/
function makeEmitCircuit(env, astNode, signame) {
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode);

   for (let i = 0; i <= l; i++) {
      const sig = getSignalObject(env, signame, astNode);
      const sig_gate = signalGate(sig, i);

      connectTo(goList[i], sig_gate);

      // exec nodes
      if (astNode instanceof ast.Exec) {
	 astNode.signal = sig;
	 // MS 20jan2025: fix, exec signals are sent during the
	 // machine.update operation (see machine.js)
	 // This fixes causal-artist-player.hh.js, depnowval.hh.js,
	 // and depnowval-local.hh.js bugs
	 // sig.set_value(astNode.exec_status.value, i, astNode.loc);
	 const exec_emission_func = function() {
	    astNode.exec_status.value = undefined;
	 }

	 const anet = new net.ActionNet(
	    astNode, "_exec_return_sig",
	    i, exec_emission_func, []);

	 connectTo(goList[i], anet);
	 connectTo(anet, kMatrix[0][i]);
      } else {
	 // regular nodes
	 // Warning: the key must be signame and *not* sig.name, in
	 // case of bouded signals.
	 astNode.signal_map[signame] = sig;

	 if (astNode.func || astNode.accessor_list.length > 0) {
	    bindSigAccessorList(env, astNode.accessor_list, astNode);
	    const expr = new net.SignalExpressionNet(
	       astNode, sig, signame + "_sig_expr", i,
	       astNode.func, astNode.accessor_list);
	    if (i <= sig.depth || l === sig.depth) {
	       connectTo(goList[i], expr);
	    } else {
	       const or = net.makeOr(astNode, "goi_or_gol", i);

	       connectTo(or, expr);
	       connectTo(goList[i], or);
	    }
	    connectTo(expr, kMatrix[0][i]);
	 } else {
	    connectTo(goList[i], kMatrix[0][i]);
	 }
      }
   }

   return new Circuit(astNode,
		      // --
		      goList,    // GO
		      res,       // RES
		      susp,      // SUSP
		      killList,  // KILL
		      // --
		      sel,       // SEL
		      kMatrix);  // K
}

/*---------------------------------------------------------------------*/
/*    makeEmitIfCircuit ...                                            */
/*---------------------------------------------------------------------*/
function makeEmitIfCircuit(env, astNode) {
   let emit_node;

   if (astNode.signame_list.length === 1) {
      emit_node = makeEmitCircuit(env, astNode, astNode.signame_list[0]);
   } else {
      emit_node = makeSequenceCircuit(
	 env, astNode, astNode.signame_list.map(
	    (el, i, arr)  => makeEmitCircuit(env, astNode, el)));
   }

   // Basically, we build a dummy If AST node, giving it if_func and
   // if_accessor_list of the Emit node, to be able to build an if
   // circuit, with the emit in then branch.
   if (astNode.if_func) {
      let if_circuit;
      let nothing_circuit;
      const if_ast = new ast.If("IF", undefined, astNode.loc,
				true, [], false,
				astNode.if_func, astNode.if_accessor_list);

      if_ast.machine = astNode.machine;
      if_ast.depth = astNode.depth;
      nothing_circuit = makeNothingCircuit(if_ast, astNode);
      if_circuit = makeIfCircuit(env, if_ast, [emit_node, nothing_circuit]);

      return if_circuit;
   }

   return emit_node;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Sustain ...                                        */
/*---------------------------------------------------------------------*/
ast.Sustain.prototype.makeCircuit = function(env, sigtable) {
   traceEnter(traceNode(this), "...");

   const cpause = makePauseCircuit(env, this);
   const cemit = makeEmitIfCircuit(env , this);
   const cseq = makeSequenceCircuit(env, this, [cemit, cpause]);
   this.circuit = makeLoopCircuit(env, this, cseq);

   linkDynamicNode(this);
   
   traceExit(traceNode(this));
   
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::If ...                                             */
/*---------------------------------------------------------------------*/
ast.If.prototype.makeCircuit = function(env, sigtable) {
   traceEnter(traceNode(this), "...");

   const cc0 = this.children[0].makeCircuit(env, sigtable);
   const cc1 = this.children[1].makeCircuit(env, sigtable);
   
   this.circuit = makeIfCircuit(env, this, [cc0, cc1]);
   linkDynamicNode(this);

   traceExit(traceNode(this));

   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeIfCircuit ...                                                */
/*    -------------------------------------------------------------    */
/*    Figure 11.5, page 117, rules page 150                            */
/*---------------------------------------------------------------------*/
function makeIfCircuit(env, astNode, childCircuits) {
   const kmaxlen =
      Math.max.apply(undefined, childCircuits.map(c => c.kMatrix.length));
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode);

   // ct,GO <- GO ^ s
   // cf,GO <- GO ^ !s
   for (let i = 0; i <= l; i++) {
      const s = makeExpressionNet(env, astNode, i);
      const go_and_s = net.makeAnd(astNode, "go^s", i);
      const go_and_not_s = net.makeAnd(astNode, "go^!s", i);

      if (!(astNode.func instanceof ast.$Delay)) {
	 // MS 1 Dec 2025
	 // connect the GO to the test only for true expression
	 connectTo(goList[i], s);
      }
      
      connectTo(goList[i], go_and_s);
      connectTo(goList[i], go_and_not_s);

      connectTo(s, go_and_s, astNode.not ? net.FAN.NEG : net.FAN.STD);
      connectTo(s, go_and_not_s, astNode.not ? net.FAN.STD : net.FAN.NEG);

      connectTo(go_and_s, childCircuits[0].goList[i]);
      connectTo(go_and_not_s, childCircuits[1].goList[i]);
   }

   // c.RES <- RES
   childCircuits.forEach(c => connectTo(res, c.res));

   // c.SUSP <- SUSP
   childCircuits.forEach(c => connectTo(susp, c.susp));

   // c.KILL <- KILL
   childCircuits.forEach(c => connectToList(killList, c.killList, connMode.GO));

   // SEL <- c.SEL
   const or_sel = net.makeOr(astNode, "Vsel");

   childCircuits.forEach(c => connectTo(c.sel, or_sel));
   connectTo(or_sel, sel);
   
   // Kn <- ct.Kn v cf.Kn
   for (let k = 0; k < kmaxlen; k++) {
      if (!childCircuits[0].kMatrix[k]) {
	 // then child has no kn
	 connectToList(childCircuits[1].kMatrix[k], kMatrix[k], connMode.K);
      } else if (!childCircuits[1].kMatrix[k]) {
	 // else child has no kn
	 connectToList(childCircuits[0].kMatrix[k], kMatrix[k], connMode.K);
      } else {
	 const orKiList = Array.from({length: l + 1}, (_, i) => {
	    return net.makeOr(astNode, `Vk${i}`);
	 });
	 childCircuits.forEach(c => connectToList(c.kMatrix[k], orKiList, connMode.K));
	 connectToList(orKiList, kMatrix[k], connMode.K);
      }
   }

   return assertCircuitInterfaceConnections(
      new Circuit(astNode,
		  // --
		  goList,    // GO
		  res,       // RES
		  susp,      // SUSP
		  killList,  // KILL
		  // --
		  sel,       // SEL
		  kMatrix)); // K
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Halt ...                                           */
/*---------------------------------------------------------------------*/
ast.Halt.prototype.makeCircuit = function(env, sigtable) {
   traceEnter(traceNode(this), "...");
   
   this.circuit = makeHaltCircuit(this, this);
   linkDynamicNode(this);
   
   traceExit(traceNode(this));
	     
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeHaltCircuit ...                                              */
/*---------------------------------------------------------------------*/
function makeHaltCircuit(env, astNode) {
   return makeLoopCircuit(env, astNode, makePauseCircuit(env, astNode));
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Exec ...                                           */
/*---------------------------------------------------------------------*/
ast.Exec.prototype.makeCircuit = function(env, sigtable) {
   const exec_status = {
      id: undefined,
      value: undefined,
      active: false,
      prev_active: false,
      kill: false,
      prev_killed: false,
      suspended: false,
      prev_suspended: false,
      start: false,
      astNode: this,
      signal: this.signame && getSignalObject(env, this.signame, this),
      depth: this.depth,

      // abort or await use this wire instead of signal wire to know
      // when user routine is done
      callback_wire: net.makeOr(this, "callback"),

      func_start: this.func,
      func_susp: this.func_susp,
      func_kill: this.func_kill,
      func_res: this.func_res
   };
   exec_status.callback_wire.sweepable = false;
   this.machine.exec_status_list.push(exec_status);

   //
   // needed for particular case in Abort (via this nested Await
   // instruction) and Emit
   //
   this.exec_status = exec_status;

   //
   // make_await/sequence/emit take account of incarnation levels
   //
   const await_node = makeAwaitCircuit(env, this);

   for (let l = 0; l <= this.depth; l++) {
      const start = new net.ActionNet(
	 this, "start", l, function() {
   	    exec_status.start = true;
	    exec_status.lvl = l;
	 }, []);
      connectTo(await_node.goList[l], start);

      const kill = new net.ActionNet(
	 this, "kill", l, function() {
	    exec_status.kill = true;
	 }, []);
      connectTo(await_node.killList[l], start, net.FAN.NEG);
      connectTo(await_node.killList[l], kill);

      //
      // kill handler must be called in case of abortion
      //
      const andDetectAbort = new net.ActionNet(
	 this, "abort", l, function() {
	    exec_status.kill = true;
	 }, []);
      connectTo(await_node.res, andDetectAbort, net.FAN.NEG);
      connectTo(await_node.susp, andDetectAbort, net.FAN.NEG);
      connectTo(await_node.sel, andDetectAbort);

      const susp = new net.ActionNet(
	 this, "susp", l, function() {
   	    exec_status.suspended = true;
	 }, []);
      connectTo(await_node.susp, susp);
      connectTo(await_node.sel, susp);

      const res = new net.ActionNet(
	 this, "res", l, function() {
   	    exec_status.suspended = false;
	 }, []);
      connectTo(await_node.res, res);
      connectTo(await_node.sel, res);

      bindSigAccessorList(env, this.accessor_list, this);
      signal.runtimeSignalAccessor(this, this.accessor_list, l, null);
   }

   if (this.signame) {
      const cemit = makeEmitCircuit(env, this, this.signame);
      this.circuit = makeSequenceCircuit(env, this, [await_node, cemit]);
   } else {
      this.circuit = await_node;
   }

   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Run ...                                            */
/*---------------------------------------------------------------------*/
ast.Run.prototype.makeCircuit = function(env, sigtable) {
   linkSigDeclList(env, this.sigDeclList, this);

   const nenv = this.sigDeclList.filter(s => s.signal);
   const unbound = this.sigDeclList.filter(s => !s.signal);

   if (unbound.length > 0) {
      unbound.forEach(sigprop => sigprop.alias = undefined);
      const local = new ast.Local("%LOCAL", this.id + "%%unbound", this.loc,
				  this.nodebug, unbound, [this]);
      ast.computeNodeRegisterId(local, this.instr_seq + "%");
      local.depth = this.depth;
      local.machine = this.machine;
      
      return local.makeCircuit(env, sigtable);
   } else {
      this.circuit = this.children[0].makeCircuit(nenv, sigtable);

      linkDynamicNode(this);
      return this.circuit;
   }
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Local ...                                          */
/*---------------------------------------------------------------------*/
ast.Local.prototype.makeCircuit = function(env, sigtable) {
   traceEnter(traceNode(this), "...");

   this.circuit = makeLocalCircuit(env, this, sigtable);
   linkDynamicNode(this);

   traceExit(traceNode(this));
   
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeLocalCircuit ...                                             */
/*    -------------------------------------------------------------    */
/*    Fig 11.14, page 125, rules page 153                              */
/*---------------------------------------------------------------------*/
function makeLocalCircuit(env, astNode, sigtable) {
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode);
   const child = astNode.children[0];
   // if the LOCAL is in a loop, lc == l + 1, otherwise lc == l
   const lc = child.depth;
   const mach = astNode.machine;

   if (astNode.children.length > 1) {
      throw new Error("makeLocalCircuit: too many children for local");
   }
   
   // As child circuit can use signal declared in astNode local, we need to
   // build them first.
   const initList = [];

   // Generation of signal in the Local scope.  For now, Only
   // unbound signals are created, and `accessibility` is ignored.
   astNode.sigDeclList.forEach(sigprop => {

      if (!sigprop.alias) {
	 const axs = mach.sigpre ? sigtable.get(sigprop.name) : unOptAxs;
	 const pre_reg = axs?.get_pre
	    && new net.RegisterNet(astNode, sigprop.name + "_pre_reg", 0);
	 const s = new signal.Signal(
	    astNode, sigprop, pre_reg,
	    kMatrix[1], killList, susp, lc);

	 sigprop.signal = s;
	 astNode.machine.local_signal_list.push(s);

	 // Reinstantiation of local signal. Involves the call to
	 // reset function and the call of init function (which has
	 // dependencies). Same of reinit (happens on RES, or GO if no
	 // init provided).
	 for (let i = 0; i <= lc; i++) {
	    if (s.init_func) {
	       bindSigAccessorList(env, s.init_accessor_list, astNode);
	       const action_init = new net.ActionNet(
		  astNode, "init", i, function() {
		     signal.create_scope.call(this, s, i);
		  }, s.init_accessor_list);
	       connectTo(goList[i], action_init);
	       // MS9mar2025 to fix bug-dep-73dc062.hh.js
	       // see runtimeSignalAccessor
	       s.init_gates[i] = action_init;
	       initList.push(action_init);
	    }

	    if (s.reinit_func) {
	       bindSigAccessorList(env, s.reinit_accessor_list, astNode);
	       const action_reinit = new net.ActionNet(
		  astNode, "reinit", i, function() {
		     signal.resume_scope.call(this, s, i);
		  }, s.reinit_accessor_list);
	       connectTo(res, action_reinit);
	    }
	 }
      } else {
	 // The signal is aliased. Hence, we have to reference the
	 // signal attribute of the signal property to the signal
	 // object. This attribute is empty when the signal property
	 // comes from module used in a run statement.
	 if (!sigprop.signal) {
	    sigprop.signal = getSignalObject(env, sigprop.alias, astNode);
	 }
      }
   });

   // Child circuit iteration and connexion
   const c = child.makeCircuit(env.concat(astNode.sigDeclList), sigtable);

   // debug
   if (assert) {
      if (kMatrix.length !== c.kMatrix.length) {
	 console.error("C=", c.astNode.ctor, astNode.returnCode, astNode.ctor);
	 throw new Error(`makeLocalCircuit: wrong kMatrix length ${kMatrix.length}/${c.kMatrix.length}`);
      }
   }

   // if child as a kMatrix.length > 1, connect the const0 to
   // the LOCAL kmatrix[1]
   if (c.kMatrix.length < 2) {
      for (let i = 0; i <= l; i++) {
	 const const0 = net.makeOr(astNode, "const.0", i);
	 connectTo(const0, kMatrix[1][i]);
      }
   }

   // c.RES <= RES
   connectTo(res, c.res);

   // c.SUSP <= SUSP
   connectTo(susp, c.susp);

   // SEL <- c.SEL
   connectTo(c.sel, sel);
   
   // c.KILL <- KILL
   connectToList(killList, c.killList, connMode.GO);

   // K <- c.K
   for (let k = 0; k < c.kMatrix.length; k++) {
      connectToList(c.kMatrix[k], kMatrix[k], connMode.K);
   }

   // connect go to child
   //
   // Actually, signal initialization net (if exists) is connected to
   // child, this ensures that local signal is initialized before
   // starting the body.
   //
   // Another possibilitie would be to add the initialization net to
   // the dependency list of the signal, but it may lead to cycle
   // error (making an embed emission to depends of the go, but also
   // the local k0 depends of the emission...)
   for (let i = 0; i <= l; i++) {
      const go = initList[i] ? initList[i] : goList[i];
      connectTo(go, c.goList[i]);
   }

   return assertCircuitInterfaceConnections(
      new Circuit(astNode,
		  // --
		  goList,     // GO
		  res,        // RES
		  susp,       // SUSP
		  killList,   // KILL
		  // --
		  sel,        // SEL
		  kMatrix));  // K
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Module ...                                         */
/*    -------------------------------------------------------------    */
/*    Fig 11.15, page 126                                              */
/*---------------------------------------------------------------------*/
ast.Module.prototype.makeCircuit = function(env, sigtable) {
   traceEnter(traceNode(this), "...");
   
   const boot_reg = new net.RegisterNet(this, "BOOT", 0);
   const const0 = net.makeOr(this, "CONST.0");
   let signalsReady = false;

   //
   // It's mandatory that `boot_reg` propagates BEFORE `const0` the
   // first reaction. It's OK with current known list, but keep that
   // in mind. (we also could make a dependency of `boot_reg` to
   // `const0`?)
   //
   connectTo(const0, boot_reg);
   this.machine.boot_reg = boot_reg;

   // nenv must be constructed incrementally in order to support
   // initialization dependencies
   const nenv = env;

   for (let i = 0; i < this.sigDeclList.length; i++) {
      const sigdecl = this.sigDeclList[i];
      const axs = this.machine.sigpre ? sigtable.get(sigdecl.name) : unOptAxs;
      const pre_reg = axs?.get_pre
	 ? new net.RegisterNet(this, sigdecl.name + "_pre_reg", 0)
	 : null;
      const s = new signal.Signal(this, sigdecl, pre_reg, null, null, null, this.depth);

      nenv.push(sigdecl);

      if (sigdecl.accessibility & ast.IN) {
	 this.machine.input_signal_map[s.name] = s;

	 //
	 // This is a bit hacky, but it allows to known from the
	 // reactive machine net list if this net is the one of a
	 // global input signal.
	 //
	 // This is important to fill the known list at the beginning
	 // of the reaction: if the net is from an global input
	 // signal, then it must check if the signal has been emitted
	 // by the environment. If it is, the net must be added in the
	 // known list.
	 //
	 // It is quicker and simpler than iterate on the
	 // input_signal_map (which was previously done).
	 //
	 s.gate_list[0].signal = s;

	 // debug
	 if (!(s.gate_list[0] instanceof net.SignalNet)) {
	    throw new Error(`makeCircuit::Module, gate_list[0] not a signal ${s.gate_list[0].constructor.name}`);
	 }
	 if (!(s.gate_list[0].accessibility & ast.INOUT)) {
	    throw new Error(`makeCircuit::Module, gate_list[0] bad accessibility ${s.gate_list[0].accessibility}`);
	 }
      }

      if (sigdecl.accessibility & ast.OUT) {
	 this.machine.output_signal_map[s.name] = s;
      }
      this.machine.global_signal_map[s.name] = s;
      //
      // Signal reinitialization overrides if exists signal
      // initialization.
      //
      if (s.reinit_func) {
	 bindSigAccessorList(env, s.reinit_accessor_list, this);
	 const action_reinit = new net.ActionNet(
	    this, "reinit", 0, function() {
	       signal.resume_scope.call(this, s);
	    }, s.reinit_accessor_list);

	 if (!signalsReady) {
	    signalsReady = net.makeOr(this, "global_signals_ready");
	 }
	 
	 connectTo(const0, action_reinit, net.FAN.NEG);
	 connectTo(action_reinit, signalsReady, net.FAN.DEP);
      } else if (s.init_func) {
	 bindSigAccessorList(env, s.init_accessor_list, this);
	 const action_init = new net.ActionNet(
	    this, "init", 0, function() {
	       signal.create_scope.call(this, s, 0);
	    }, s.init_accessor_list);
	 
	 if (!signalsReady) {
	    signalsReady = net.makeOr(this, "global_signals_ready");
	 }
	 
	 connectTo(boot_reg, action_init);
	 connectTo(action_init, signalsReady, net.FAN.DEP);
      }
   }

   // compile the whole module
   if (this.children.length > 1)
      throw new Error("too many children!");

   const child = this.children[0];

   child.makeCircuit(nenv, sigtable);

   // signals connections
   if (signalsReady) {
      connectTo(boot_reg, signalsReady);
      connectTo(signalsReady, child.circuit.goList[0]);
   } else {
      connectTo(boot_reg, child.circuit.goList[0]);
   }

   // allocate and connect global sel and res wires
   const global_sel = net.makeOr(this, "global_sel");
   const global_res = net.makeAnd(this, "global_res");
   
   if (debugTrace || debugTraceCircuit.indexOf(this.ctor) >= 0) {
      global_sel.setDebugTrace();
      global_res.setDebugTrace();
   }
   
   connectTo(boot_reg, global_res, net.FAN.NEG);
   connectTo(global_sel, global_res);
   
   // connect child circuit to the module
   if (child.circuit.res) {
      connectTo(global_res, child.circuit.res);
   }

   if (child.circuit.sel) {
      connectTo(child.circuit.sel, global_sel);
   }

   if (child.circuit.killList) {
      child.circuit.killList.forEach(kl => connectTo(const0, kl));
   }

   if (child.circuit.goList && child.circuit.goList[1]) {
      connectTo(const0, child.circuit.goList[1]);
   }

   if (child.circuit.susp) {
      connectTo(const0, child.circuit.susp);
   }

   // Connect sel, K0 (level 0) and K1 (level 0)
   this.machine.sel = child.circuit.sel;
   if (child.circuit.kMatrix[0]) {
      const i0 = child.circuit.kMatrix[0][0];
      const i1 = child.circuit.kMatrix[0][1];

      this.machine.k0 = net.makeOr(this, "global_k0");

      if (i0) connectTo(i0, this.machine.k0);
      if (i1) connectTo(i1, this.machine.k0);
   }

   if (child.circuit.kMatrix[1]) {
      const i0 = child.circuit.kMatrix[1][0];
      const i1 = child.circuit.kMatrix[1][1];

      this.machine.k1 = net.makeOr(this, "global_k1");
      if (i0) connectTo(i0, this.machine.k1);
      if (i1) connectTo(i1, this.machine.k1);
   }

   this.circuit = new Circuit(this,
			      // --
			      [boot_reg],       // GO
			      global_res,       // RES
			      const0,           // SUSP
			      [const0],         // KILL
			      // --
			      global_sel,       // SEL
			      [[this.machine.k0], [this.machine.k1]]); // K

   if (debugTrace || debugTraceCircuit.indexOf(this.ctor) >= 0) {
      const def = boot_reg.getDebugTrace();
      boot_reg.setDebugTrace(function(age) {
	 console.error("====================================================");
	 return def.call(this, age);
      });
   }
   
   traceExit(traceNode(this));

   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    reentrantSurface ...                                             */
/*    -------------------------------------------------------------    */
/*    The surface of loop (everything before the first yields)         */
/*    is reentrant, i.e., contains no par and no local.                */
/*---------------------------------------------------------------------*/
function reentrantSurface(nodes) {
   
   function reentrantNode(n) {
      if (n instanceof ast.Pause) {
	 return true;
      } if (n instanceof ast.If) {
	 const l = reentrantSurface(n.children[0]);
	 const r = reentrantSurface(n.children[1]);

	 if (l && r) {
	    return true;
	 } else if (l === false || r === false) {
	    return false;
	 }
      } else if (n instanceof ast.Sequence) {
	 const r = reentrantSurface(n.children);
	 if (r === true) {
	    return true;
	 } else if (r === false) {
	    return false;
	 }
      } else if (n instanceof ast.Atom) {
	 return undefined;
      } else if (n instanceof ast.Emit) {
	 return undefined;
      } else if (n instanceof ast.Await) {
	 if (!n.immediate) {
	    return true;
	 } else {
	    return undefined;
	 }
      } else if (n instanceof ast.Halt) {
	 return true;
      } else if (n instanceof ast.Nothing) {
	 return undefined;
      } else if (n instanceof ast.Exit) {
	 return undefined;
      } else if (n instanceof ast.Trap) {
	 const r = reentrantSurface(n.children);
	 if (r === true) {
	    return true;
	 } else if (r === false) {
	    return false;
	 }
	 return undefined;
      } else if (n instanceof ast.Abort) {
	 const r = reentrantSurface(n.children);
	 if (r === true) {
	    return true;
	 } else if (r === false) {
	    return false;
	 }
	 return undefined;
      } else if (n instanceof ast.Suspend) {
	 const r = reentrantSurface(n.children);
	 if (r === true) {
	    return true;
	 } else if (r === false) {
	    return false;
	 }
	 return undefined;
      } else if (n instanceof ast.Fork) {
	 const rs = n.children.map(reentrantNode);

	 if (rs.every(v => v === true)) {
	    return true;
	 } else if (rs.find(v => v === false)) {
	    return false;
	 } else {
	    return undefined;
	 }
      } else if (n instanceof ast.Loop) {
	 const r = reentrantSurface(n.children);

	 if (r === true) {
	    return true;
	 } else if (r === false) {
	    return false;
	 }
      } else {
	 //console.error("NOT REENTRANT:", n.constructor.name);
	 return false;
      }
   }
   
   if (nodes.length === 0) {
      return true;
   } else {
      for (let i = 0; i < nodes.length; i++) {
	 const r = reentrantNode(nodes[i]);
	 
	 if (r === true) {
	    return true;
	 } else if (r === false) {
	    return false;
	 }
      }
      return undefined;
   }
}

/*---------------------------------------------------------------------*/
/*    reentrantTail ...                                                */
/*    -------------------------------------------------------------    */
/*    The tail of a loop (everything after the last yields) is         */
/*    reentrant.                                                       */
/*---------------------------------------------------------------------*/
function reentrantTail(nodes) {
   return false;
}

/*---------------------------------------------------------------------*/
/*    reincarnatingLoop ...                                            */
/*    -------------------------------------------------------------    */
/*    Returns true iff the loop exhibits re-incarnation problem and    */
/*    needs duplication (if circuit re-incarnation is disabled).       */
/*---------------------------------------------------------------------*/
function reincarnatingLoop(node) {
   if (reentrantSurface(node.children) === true) {
      return false;
   } else if (reentrantTail(node.children) === true) {
      return false;
   }
   return true;
}

/*---------------------------------------------------------------------*/
/*    unrollLoop ...                                                   */
/*---------------------------------------------------------------------*/
function unrollLoop(astNode) {
   astNode.children = astNode.children.map(unrollLoop);

   if ((astNode instanceof ast.Loop) && reincarnatingLoop(astNode)) {
      if (astNode.children.length > 1) {
	 throw new Error("unrollLoop: bad formed loop");
      }
      const p = astNode.children[0];
      const p2 = p.duplicate()
	 .acceptAuto(n => {
	    n.machine = astNode.machine;
	    n.ctor += "'";
	 });
      //console.error("unroll", p.constructor.name);
      const seq = new ast.Sequence("SEQUENCE", null, astNode.loc,
				   astNode.nodebug,
				   [ p, p2 ]);
      astNode.children = [ seq ];

      seq.parent = astNode;

      return astNode;
   } else if (astNode instanceof ast.LoopEach) {
      // LoopEach requires to be expanded into abort/halt form before
      // being duplicated
      const loc = astNode.loc;
      const nodebug = astNode.nodebug;
      const func = astNode.func;
      const axs = astNode.accessor_list;
      
      const halt = new ast.Halt("HALT", null, loc, nodebug);
      const seq = new ast.Sequence("SEQUENCE", null, loc, nodebug,
				   astNode.children.concat([halt]));
      const abort = new ast.Abort("ABORT", null, loc, nodebug,
				   astNode.func, astNode.accessor_list,
				   false,
				   astNode.func_count,
				   astNode.accessor_list_count,
				   [seq]);
      const loop = new ast.Loop("LOOP", null, loc, nodebug, [abort]);
      loop.parent = astNode.parent;
      
      return unrollLoop(loop);
   } else if (astNode instanceof ast.Every) {
      // Every requires to be expanded into abort/halt form before
      // being duplicated
      const loc = astNode.loc;
      const nodebug = astNode.nodebug;
      const func = astNode.func;
      const axs = astNode.accessor_list;

      const wait = new ast.Await("AWAIT", null, loc, nodebug,
				  astNode.func, astNode.accessor_list,
				  astNode.immediate,
				  astNode.func_count,
				  astNode.accessor_list_count);
      const loopeach = new ast.LoopEach("LOOPEACH", null, loc, nodebug,
					astNode.children,
					astNode.func, astNode.accessor_list,
					astNode.func_count,
					astNode.accessor_list_count);
      const seq = new ast.Sequence("SEQUENCE", null, loc, nodebug,
				   [wait, loopeach]);
      seq.parent = astNode.parent;
					
      return unrollLoop(seq);
   } else {
      return astNode;
   }
}

/*---------------------------------------------------------------------*/
/*    computeNodeDepth ...                                             */
/*---------------------------------------------------------------------*/
function computeNodeDepth_int(astNode, depth, inloop) {
   
   function rec(astNode, depth, in_loop) {
      
      if (astNode instanceof ast.Loop || astNode instanceof ast.LoopEach) {
	 in_loop = true;
      } else if (astNode instanceof ast.Fork || astNode instanceof ast.Local) {
	 if (in_loop) {
	    depth++;
	    in_loop = false;
	 }
      }

      if (astNode instanceof ast.Module) {
	 astNode.depth = 0;
      } else {
	 astNode.depth = depth;
      }
      
      astNode.children.forEach((c, i, a) => { 
	 rec(c, depth, in_loop) ;
      });
   }

   return rec(astNode, depth, inloop);
}

function computeNodeDepth_new(astNode, depth, inloop) {
   
   function rec(astNode, depth, in_loop) {
      astNode.depth = depth;

      if (astNode instanceof ast.Loop || astNode instanceof ast.LoopEach) {
	 astNode.children.forEach(c => rec(c, depth, true));
      } else if (astNode instanceof ast.Fork
	 || astNode instanceof ast.Local) {
//	 || astNode instanceof ast.Trap) {
	 if (in_loop) {
	    astNode.children.forEach(c => rec(c, depth + 1, false));
	 } else {
	    astNode.children.forEach(c => rec(c, depth, in_loop));
	 }
      } else {
	 astNode.children.forEach(c => rec(c, depth, in_loop));
      }
   }

   return rec(astNode, depth, inloop);
}

function computeNodeDepth(astNode) {
   try {
      if (compiler(astNode) === "new") {
	 return computeNodeDepth_new(astNode, 0, false);
      } else {
	 return computeNodeDepth_int(astNode, 1, false);
      }
   } finally {
      traceExit(traceNode(astNode));
   }
}

/*---------------------------------------------------------------------*/
/*    compile ...                                                      */
/*---------------------------------------------------------------------*/
function compile(machine, astNode) {
   machine.nets = [];
   machine.input_signal_map = {};
   machine.output_signal_map = {};
   machine.local_signal_list = [];

   astNode.machine = machine;

   // reject non loop-safe programs
   if (machine.loopSafe) {
      loopSafe(astNode);
   }
   
   // unroll loops as an alternative to reincarnation
   if (machine.loopUnroll) {
      astNode = unrollLoop(astNode);
   }
   // reparent the whole subtree
   astNode.acceptAuto(p => p.children.forEach(c => c.parent = p));
   net.resetNetId();
   
   const sigtable = new Map();

   if (machine.sigpre) {
      collectSigAccesses(astNode, sigtable);
   }
   
   // Elaboration and linking stage
   astNode.acceptAuto(new ccutils.InitVisitor(machine));
   astNode.accept(new ccutils.SignalVisitor(machine));
   astNode.accept(new ccutils.TrapVisitor());

   ast.computeNodeRegisterId(astNode, "0");

   if (machine.reincarnation) {
      computeNodeDepth(astNode);
   }

   astNode.makeCircuit([], sigtable);

   // send 0 to all unconnected wires
   machine.nets.forEach(n => {
      if (n.faninList.length === 0 && n instanceof net.WireNet) {
	 const const0 = net.makeOr(n.astNode, "unconnect", n.astNode.depth);
	 connectTo(const0, n);
      }
   });

   // optimize the generated circuit
   sweep.sweep(machine);

   machine.nets.forEach(net => net.reset(true));
   machine.boot_reg.nextValue = true;

   const { loc, size, signals, json, posFlag } =
      causality.findCausalityError(machine, true);
   if (size > 0 && machine.verbose >= 3) {
      console.error(`Warning: Potential causality cycle`, json);
   }
}
