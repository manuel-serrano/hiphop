/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/comp-common.js            */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Thu Mar 12 07:38:52 2026                          */
/*    Last change :  Thu Mar 12 09:42:49 2026 (serrano)                */
/*    Copyright   :  2026 manuel serrano                               */
/*    -------------------------------------------------------------    */
/*    Compiler common types and tools.                                 */
/*=====================================================================*/
"use strict";
"use hopscript";

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
import * as ast from "./ast.js";
import * as error from "./error.js";
import * as net from "./net.js";
import * as signal from "./signal.js";
import { basename } from "node:path";

export {
   assert, assertCircuitInterfaceConnections,
   debugConnect, debug, debugTrace, debugTraceCircuit, debugSynchronizer,
   Circuit, makeCircuitInterface, connectTo, connectToList, connMode,
   bindSigAccessorList, getSignalObject, signalGate,
   linkDynamicNode, makeExpressionNet, makeCounterNet };

/*---------------------------------------------------------------------*/
/*    assert & debug                                                   */
/*---------------------------------------------------------------------*/
const debugConnect = process.env.HIPHOP_TRACE
   && process.env.HIPHOP_TRACE.split(",").find(n => n === "connect");
const assert = (process.env.NEW === "true");
const debug = process.env.HIPHOP_TRACE
   && process.env.HIPHOP_TRACE.split(",").find(n => n === "compile");
const debugTrace = process.env.HIPHOP_TRACE
   && process.env.HIPHOP_TRACE.split(",").find(n => n === "trace");
const debugTraceCircuit = process.env.HIPHOP_TRACE_CIRCUIT?.split(",") || [];
const debugSynchronizer = process.env.HIPHOP_TRACE
   && process.env.HIPHOP_TRACE.split(",").find(n => n === "synchronizer");

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
	 makeWireList(l, astNode, `K[${i}]`));
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

   // debug
   if (astNode.machine.compiler === "new") {
      Object.seal(goList);
      Object.seal(killList);
      Object.seal(kMatrix);
      kMatrix.forEach(k => Object.seal(k));

      if (goList.length !== kMatrix[0].length) {
	 throw new TypeError(`HipHop:makeCircuitInterface: goList and kMatrix have incompatible length (${goList.length}/${kMatrix[0].length})`);
      }
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
   const netSigList = sig.netSigList;

   if (netSigList.length <= l) {
      return netSigList[netSigList.length - 1];
   } else {
      return netSigList[l];
   }
}

/*---------------------------------------------------------------------*/
/*    bindSigAccessorList ...                                          */
/*    -------------------------------------------------------------    */
/*    Bind each signal of accessorList to its signal declaration.      */
/*---------------------------------------------------------------------*/
function bindSigAccessorList(env, accessorList, astNode, warningp) {
   accessorList.forEach(sigprop => {
      if (warningp && !sigprop.get_value && !sigprop.get_pre && astNode.machine.verbose >= 0) {
	 const loc = astNode.loc;
	 const cwd = config.Process.cwd();
	 const path = loc.filename.indexOf(cwd) === 0
	    ? loc.filename.substring(cwd.length+1)
	    : loc.filename;

	 console.error(`File "${path}", character: ${loc.pos}: ${sigprop.signame}`);
	 console.error(`*** WARNING: mixing signal value and status, and JavaScript expression`);
	 console.error("See " + config.homepage + "/doc/lang/signal.htmldelay\n");
      }
      sigprop.signal = getSignalObject(env, sigprop.signame, astNode);
   });
}

/*---------------------------------------------------------------------*/
/*    connMode ...                                                     */
/*---------------------------------------------------------------------*/
const connMode = { GO: 101, K: 102, KGO: 103, KK: 104, FORK: 105, MERGE: 106, BRANCH: 107, CONNECT: 108, RNCAGO: 109, RNCAKILL: 110, RNCAKMATRIX: 111 };

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
/*     * mode = BRANCH: FROM.length <= TO.length                       */
/*         missing TO elements are connected to last from.             */
/*     * mode = K: FROM.length >= TO.length                            */
/*         extra FROM elements are or-ed into n-1                      */
/*---------------------------------------------------------------------*/
function connectToList(from_list, to_list, mode, connType = net.FAN.STD) {
   const fl = from_list.length;
   const tl = to_list.length;

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

      case connMode.CONNECT:
	 if (fl !== tl) {
	    throw new Error(`connectToList(CONNECT), list differ ${fl}/${tl}`);
	 } else {
	    for (let i = 0; i < fl; i++) {
	       connectTo(from_list[i], to_list[i], connType);
	    }
	 }
	 return;
	 
      case connMode.RNCAGO:
	 if (fl > tl) {
	    throw new Error(`connectToList(RNCAGO), from list too big ${fl}/${tl}`);
	 } else {
	    for (let i = 0; i < fl; i++) {
	       connectTo(from_list[i], to_list[i], connType);
	    }
	    if (fl < tl) {
	       if (fl + 1 !== tl) {
		  throw new Error(`connectToList(RNCAGO), from list too small ${fl}/${tl}`);
	       }
	       connectTo(makeUnconnectedNet(from_list[fl - 1], tl - 1), to_list[tl - 1], connType);
	    }
	 }
	 return;

      case connMode.RNCAKILL:
	 if (fl > tl) {
	    throw new Error(`connectToList(RNCAKILL), from list too big ${fl}/${tl}`);
	 } else {
	    for (let i = 0; i < fl; i++) {
	       connectTo(from_list[i], to_list[i], connType);
	    }
	    if (fl < tl) {
	       if (fl + 1 !== tl) {
		  throw new Error(`connectToList(RNCAKILL), from list too small ${fl}/${tl}`);
	       }
	       connectTo(from_list[fl - 1], to_list[tl - 1], connType);
	    }
	 }
	 return;

      case connMode.RNCAKMATRIX:
	 if (fl < tl) {
	    throw new Error(`connectToList(RNCAKMATRIX), from list too big ${fl}/${tl}`);
	 } else {
	    for (let i = 0; i < tl; i++) {
	       connectTo(from_list[i], to_list[i], connType);
	    }
	    if (fl > tl) {
	       if (fl - 1 !== tl) {
		  throw new Error(`connectToList(RNCAKMATRIX), from list too small ${fl}/${tl}`);
	       } else {
		  const to = to_list[tl - 1];
		  const nto = connectToWire(from_list[fl - 1], to, connType);
		  to_list[tl - 1] = nto;
	       }
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
/*    As connectTo, but if TO is a wire with a fanin, create an        */
/*    explicit OR-net and return it.                                   */
/*---------------------------------------------------------------------*/
function connectToWire(from, to, mode) {
   if (to instanceof net.WireNet) {
      if (to.faninList.length > 0) {
	 const or = net.makeOr(to.astNode, to.debugName);
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

   bindSigAccessorList(env, expr.accessor_list, astNode, false);

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
   } else if (astNode.func || (astNode.accessor_list.length > 1)) {
      const name = astNode.loc?.filename
	 ? `${basename(astNode.loc.filename)}:${astNode.loc.pos}`
	 : astNode.constructor.name;
      bindSigAccessorList(env, astNode.accessor_list, astNode, astNode.func);
      n = new net.TestExpressionNet(astNode, name, level,
				    astNode.func, astNode.accessor_list);

   } else if (astNode.accessor_list.length === 1) {
      const ax = astNode.accessor_list[0];
      const prop = ax.get_pre
	 ? (ax.get_value ? "preval" : "pre")
	 : (ax.get_value ? "nowval" : "now");
      const delay = new ast.DelaySig(ax.signame, prop);
      return makePresentNet(env, astNode, delay, level);
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

   bindSigAccessorList(env, astNode.accessor_list_count, astNode, true);
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

