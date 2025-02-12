/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/compiler.js               */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal, Manuel Serrano                       */
/*    Creation    :  Mon Jul 16 18:06:28 2018                          */
/*    Last change :  Wed Feb 12 10:40:57 2025 (serrano)                */
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
import * as config from "./config.js";
import * as ast from "./ast.js";
import * as error from "./error.js";
import * as net from "./net.js";
import * as signal from "./signal.js";
import * as ccutils from "./compiler-utils.js";
import * as sweep from "./sweep.js";
import * as causality from "./causality.js";

export { compile };

/*---------------------------------------------------------------------*/
/*    assert & debug                                                   */
/*---------------------------------------------------------------------*/
const assert = (process.env.NEW === "true");
const debug = process.env.HIPHOPTRACE
   && process.env.HIPHOPTRACE.split(",").find(n => n === "compile");

let debugMargins = ["", " ", "  ", "   ", "    "];
let margin = 0;

function getMargin(margin) {
   if (margin === debugMargins.length) {
      debugMargins.push(debugMargins[margin - 1] + " ");
   }
   return debugMargins[margin];
}

/*---------------------------------------------------------------------*/
/*    traceEnter ...                                                   */
/*---------------------------------------------------------------------*/
function traceEnter(...args) {
   if (debug) {
      console.log(getMargin(margin) + ">", ...args);
      margin++;
   }
}

/*---------------------------------------------------------------------*/
/*    traceExit ...                                                    */
/*---------------------------------------------------------------------*/
function traceExit(...args) {
   if (debug) {
      margin--;
      console.log(getMargin(margin) + "<", ...args);
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
	    throw new Error(`Bad "go[${i}]" connection for ${c.astNode.constructor.name}`);
      });
      // res
      if (c.res.fanoutList.length === 0)
	 throw new Error(`Bad "res" connection for ${c.astNode.constructor.name}`);
      // susp
      if (c.susp.fanoutList.length === 0)
	 throw new Error(`Bad "susp" connection for ${c.astNode.constructor.name}`);
      // killList
      if (c.killList && !(c.killList instanceof Array))
      	 throw error.TypeError(`"killList" must be an array for ${c.astNode.constructor.name}`);
      c.killList.forEach((w, i, _) => {
	 if (w.fanoutList.length === 0)
	    throw new Error(`"kill[${i}]" disconnected in ${c.astNode.constructor.name}`);
      });

      // sel
      if (c.sel.faninList.length === 0)
	 throw new Error(`Bad "sel" connection for ${c.astNode.constructor.name}`);
      // k
      if (!(c.kMatrix instanceof Array))
      	 throw error.TypeError(`"kMatrix must" be a matrix for ${c.astNode.constructor.name}`);

      for (let k = 0; k < c.kMatrix.length; k++) {
      	 if (!(c.kMatrix[k] instanceof Array)) {
	    if (c.kMatrix[k]) {
	       throw error.TypeError("Each completion code of `kMatrix` " +
		  "must be an array \"" +
		  c.kMatrix[k].toString() +
		  "\".", astNode.loc);
	    }
      	 }
      }
      c.kMatrix.forEach((k, i, _) => k.forEach((w, j, _) => {
	 if (w.faninList.length === 0)
	    throw new Error(`"kMatrix[${i}][${j}]" disconnected in ${c.astNode.constructor.name}`);
      }));
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
	 throw new Error(`bad circuit "${c.astNode.constructor.name}", missing ${mame}`);
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
      throw new Error(`bad circuit "${c.astNode.constructor.name}", wrong kMatrix[${i}]`);
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
function makeCircuitInterface(astNode, klength) {
   
   function makeWireList(length, astNode, name) {
      return Array.from({length}, (_, i) => 
	 new net.WireNet(astNode, name + "/" + i));
   }

   function makeKMatrix(l, astNode, length) {
      return Array.from({length}, (_, i) =>
	 makeWireList(l, astNode, `k${i}`));
   }
   
   const l = astNode.depth;
   const goList = makeWireList(l + 1, astNode, "go");
   const res = new net.WireNet(astNode, "res");
   const susp = new net.WireNet(astNode, "susp");
   const killList = makeWireList(l + 1, astNode, "kill");
   const kMatrix = makeKMatrix(l + 1, astNode, klength);
   const sel = new net.WireNet(astNode, "sel");

   return { l, goList, res, susp, killList, kMatrix, sel };
}

/*---------------------------------------------------------------------*/
/*    addAxs ...                                                       */
/*---------------------------------------------------------------------*/
function addAxs(axs, table) {
   const o = table.get(axs.signame);

   if (o) {
      o.get_pre |= axs.get_pre;
      o.get_value |= axs.get_value;
   } else {
      table.set(axs.signame, Object.assign({}, axs));
   }
}

/*---------------------------------------------------------------------*/
/*    collectSigAccesses ...                                           */
/*---------------------------------------------------------------------*/
function collectSigAccesses(node, table) {
   if (node instanceof ast.$ActionNode) {
      node.accessor_list.forEach(s => addAxs(s, table));
      if (node instanceof ast.$Emit) {
	 node.if_accessor_list.forEach(s => addAxs(s, table));
      }
   } else if (node instanceof ast.$Exec) {
      node.accessor_list.forEach(s => addAxs(s, table));
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
function signalGate(sig, lvl) {
   const gate_list = sig.gate_list;

   if (gate_list.length <= lvl) {
      return gate_list[gate_list.length - 1];
   } else {
      return gate_list[lvl];
   }
}

/*---------------------------------------------------------------------*/
/*    bindSigAccessorList ...                                          */
/*    -------------------------------------------------------------    */
/*    Bind each signal of sigList to its signal declaration.           */
/*---------------------------------------------------------------------*/
function bindSigAccessorList(env, siglist, astNode) {
   siglist.forEach(sigprop => {
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
/*    linkNode ...                                                     */
/*---------------------------------------------------------------------*/
function linkNode(astNode) {
   //
   // This function must be called *only* in ast.*.makeCircuit() and
   // *never* in make*. Otherwise, it could result that the oneshot
   // register is push not on the top of dynamically added branch but
   // inside an embded instruction
   //
   if (astNode.dynamic) {
      const reg = new net.RegisterNet(astNode, "oneshot_register", 0);
      const const0 = net.makeOr(astNode, "oneshot_register_reset");

      const0.connectTo(reg);
      reg.connectTo(const0, net.FAN.DEP);
      reg.connectTo(astNode.circuit.goList[astNode.depth]);
      reg.dynamic = true;
      astNode.dynamic = false;
   }
}

/*---------------------------------------------------------------------*/
/*    connectToList ...                                                */
/*    -------------------------------------------------------------    */
/*    Connect all the corresponding FROM gates to the TO gates.        */
/*    -------------------------------------------------------------    */
/*    If the FROM list is smaller than the TO list, connects the       */
/*    last gate of FROM to the last gate to TO.                        */
/*    If the FROM list is giger that the TO list, connect the last     */
/*    gate of the FROM list to the penultimate gate of the TO list.    */
/*---------------------------------------------------------------------*/
function connectToList(from_list, to_list) {
   const l = from_list.length;
   
   for (let i = 0; i < l - 1; i++) {
      from_list[i].connectTo(to_list[i]);
   }

   if (to_list.length === from_list.length) {
      from_list[l - 1].connectTo(to_list[l - 1]);
   } else if (to_list.length === from_list.length + 1) {
      // to_list.length > from_list.length
      from_list[l - 1].connectTo(to_list[l - 1]);
      from_list[l - 1].connectTo(to_list[l]);
   } else if (to_list.length === from_list.length - 1) {
      // to_list.length < from_list.length
      from_list[l - 1].connectTo(to_list[l - 2]);
   } else {
      throw new Error(`Incompatible from_list/to_list (${from_list.length}/${to_list.length})`);
   }
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::ASTNode ...                                        */
/*---------------------------------------------------------------------*/
ast.ASTNode.prototype.makeCircuit = function(env, sigtable) {
   throw error.TypeError("makeCircuit: no implementation for this node `"
      + this.tag + "'",
			 this.loc);
}

/*---------------------------------------------------------------------*/
/*    makeExpressionNet ...                                            */
/*---------------------------------------------------------------------*/
function makeExpressionNet(env, astNode, level) {
   let n = null;

   if (astNode.func || astNode.accessor_list.length > 0) {
      bindSigAccessorList(env, astNode.accessor_list, astNode);
      n = new net.TestExpressionNet(astNode, "testexpr", level,
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
   const init_counter_func = function() {
      const init_val = parseInt(func_count.call(this));
      if (init_val < 1) {
	 error.RuntimeError( "Assert counter expression > 0 failed.",
			     astNode.loc);
      }
      counter = init_val;
      return init_val;
   }

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

   init_or.connectTo(init_net);

   return { cnt: res, reset: init_or };
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Fork ...                                           */
/*    -------------------------------------------------------------    */
/*    Fig 11.10, page 122                                              */
/*---------------------------------------------------------------------*/
ast.Fork.prototype.makeCircuit = function(env, sigtable) {

   function makeParallelCircuit(env, astNode, childCircuits) {
      const goList = [];
      let res = null;
      let susp = null;
      let killList = null;
      let sel = null;
      const kMatrix = [];

      // Broadcast GO
      for (let l = 0; l <= astNode.depth; l++) {
	 childCircuits.forEach(c => {
	    const child_go = c.goList[l];

	    if (child_go) {
	       if (!goList[l]) {
		  goList[l] = net.makeOr(astNode, "go", l);
	       }
	       goList[l].connectTo(child_go);
	    }
	 });
      }

      // Broadcast RES, SUSP, KILL
      res = ccutils.getResChildren(astNode, ast.Fork, childCircuits);
      susp = ccutils.getSuspChildren(astNode, ast.Fork, childCircuits);
      killList = ccutils.killListChildren(astNode, ast.Fork, childCircuits);

      // Union on SEL
      childCircuits.forEach(c => {
	 const child_sel = c.sel;

	 if (child_sel) {
	    if (!sel) {
	       sel = net.makeOr(astNode, "sel");
	    }
	    child_sel.connectTo(sel);
	 }
      })

      // union is a matrix which is indexed by return code and then by
      // incarnation level.
      const union = [];

      // min is a 3D array which is indexed by children, by return code
      // and then by incarnation level
      const min = [];

      // max completion code of the parallel + 1
      let max = 0;

      childCircuits.forEach(c => {
	 if (c.kMatrix.length > max) {
	    max = c.kMatrix.length;
	 }
      });

      // Union K of children
      childCircuits.forEach(iChild => {
	 for (let k = 0; k < max; k++) {
	    if (!union[k]) {
	       union[k] = [];
	       for (let i = 0; i <= astNode.depth; i++) {
		  union[k][i] =
		     net.makeOr(astNode, "union_k" + k, i);
	       }
	    }
	    const kList = ccutils.getKListChild(astNode, ast.Fork, iChild, k);
	    for (let i = 0; i <= astNode.depth; i++) {
	       if (kList[i]) {
		  kList[i].connectTo(union[k][i]);
	       }
	    }
	 }
      });

      // Connect EXIT to KILL
      if (killList) {
	 for (let k = 2; k < union.length; k++) {
	    for (let i = union[k].length - 1; i >= 0; i--) {
	       if (!killList[i]) {
		  killList[i] = net.makeOr(astNode, "pkill", i);
	       }
	       union[k][i].connectTo(killList[i]);
	    }
	 }
      }

      // Min of children
      for (let c = childCircuits.length - 1; c >= 0; c--) {
	 const child_interface = childCircuits[c];
	 const child_kMatrix = child_interface.kMatrix;
	 const child_min_matrix = [];

	 min[c] = child_min_matrix;
	 child_min_matrix[0] = [];


	 // connect all incarnation of K0 of child
	 for (let l = 0; l <= astNode.depth; l++) {
	    child_min_matrix[0][l] =
	       net.makeOr(astNode, "or_min_k0" + "_child" + c, l);
	    if (child_kMatrix[0] && child_kMatrix[0][l]) {
	       child_kMatrix[0][l]
		  .connectTo(child_min_matrix[0][l]);
	    }
	 }

	 // connect OR-NOT door with GO of parallel and SEL of child
	 const sel_not = net.makeOr(astNode, "sel_not_child" + c);

	 goList[astNode.depth].connectTo(sel_not);
	 if (child_interface.sel) {
	    child_interface.sel.connectTo(sel_not);
	 }
	 sel_not.connectTo(child_min_matrix[0][astNode.depth], net.FAN.NEG);

	 // connect all incarnation of child min Kn-1 to child min Kn
	 for (let k = 1; k < max; k++) {
	    child_min_matrix[k] = [];

	    for (let l = 0; l <= astNode.depth; l++) {
	       child_min_matrix[k][l] =
		  net.makeOr(astNode,
			     "or_min_k" + k + "_child" + c,
			     l);
	       child_min_matrix[k - 1][l]
		  .connectTo(child_min_matrix[k][l]);
	       if (child_kMatrix[k] && child_kMatrix[k][l]) {
		  child_kMatrix[k][l]
		     .connectTo(child_min_matrix[k][l]);
	       }
	    }
	 }
      }

      // Build K output doors and connect union to them
      for (let k = union.length - 1; k >= 0; k--) {
	 kMatrix[k] = [];
	 for (let l = union[k].length - 1; l >= 0; l--) {
	    kMatrix[k][l] =
	       net.makeAnd(astNode, "and_k" + k, l);
	    union[k][l].connectTo(kMatrix[k][l]);
	 }
      }

      // Connect min to K output doors
      for (let c = min.length - 1; c >= 0; c--) {
	 for (let k = min[c].length - 1; k >= 0; k--) {
	    for (let l = min[c][k].length - 1; l >= 0; l--) {
	       min[c][k][l].connectTo(kMatrix[k][l]);
	    }
	 }
      }

      return new Circuit(astNode, goList, res, susp,
    			 killList, sel, kMatrix);
   }

   const ccs = this.children.map((c, i, arr) => c.makeCircuit(env, sigtable));
   const circuit = makeParallelCircuit(env, this, ccs);
   this.circuit = circuit;


   linkNode(this);
   return circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Trap ...                                           */
/*---------------------------------------------------------------------*/
ast.Trap.prototype.makeCircuit = function(env, sigtable) {
   traceEnter(`${this.constructor.name}[${this.depth}]@${this.loc.pos}...`);

   const cc0 = this.children[0].makeCircuit(env, sigtable);
   this.circuit = makeTrapCircuit(env, this, cc0);
   linkNode(this);

   traceExit(`${this.constructor.name}[${this.depth}]@${this.loc.pos}`, this.circuit.kMatrix.length,
	      cc0.astNode.constructor.name
      + "@" + cc0.astNode.loc.pos + ":" + cc0.kMatrix.length);

   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeTrapCircuit ...                                              */
/*    -------------------------------------------------------------    */
/*    Fig 11.12, page 124, rules page 153                              */
/*---------------------------------------------------------------------*/
function makeTrapCircuit_orig(env, astNode, child_interface) {
   if (child_interface.kMatrix.length <= 2)
      return child_interface;

   const k0_list = [];
   const kMatrix_child = child_interface.kMatrix;
   const kMatrix = [k0_list];
   const k0_list_child = ccutils.getKListChild(astNode, ast.Trap, child_interface, 0);
   const trap_gate_list = ccutils.getKListChild(astNode, ast.Trap,
						child_interface, 2);

   //
   // Get K0 of child, and connect it to K0 output door
   //
   for (let l = 0; l < k0_list_child.length; l++) {
      k0_list[l] = net.makeOr(astNode, "or_k0", l);
      k0_list_child[l].connectTo(k0_list[l]);
   }

   //
   // Get K2 of child, and connect it to K0 output door
   //
   for (let l = 0; l < trap_gate_list.length; l++) {
      if (!k0_list[l])
	 k0_list[l] = net.makeOr(astNode, "or_k0", l);
      trap_gate_list[l].connectTo(k0_list[l]);
   }

   //
   // Propagate K1 of child and Shift K > 2
   //
   kMatrix[1] = ccutils.getKListChild(astNode, ast.Trap, child_interface, 1);
   for (let k = 3; k < kMatrix_child.length; k++)
      kMatrix[k - 1] = ccutils.getKListChild(astNode, ast.Trap,
					     child_interface, k);

   return new Circuit(astNode,
		      // --
		      child_interface.goList, // GO
		      child_interface.res,    // RES
		      child_interface.susp,   // SUSP
		      ccutils.killListChildren(astNode, ast.Trap, [child_interface]), // KILL
		      // --
		      child_interface.sel,    // SEL
		      kMatrix);               // K
}

function makeTrapCircuit_new(env, astNode, childCircuit) {
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode, childCircuit.kMatrix.length - 1);

   if (childCircuit.kMatrix.length <= 2) {
      return childCircuit;
   } else {
      const orK0List = Array.from({length: l + 1}, (_, i) => {
	 return net.makeOr(astNode, "or_k0");
      });
      const orKillList = Array.from({length: l + 1}, (_, i) => {
	 return net.makeOr(astNode, "or_kill");
      });
      
      // c.GO <- GO
      connectToList(goList, childCircuit.goList);

      // c.RES <- RES
      res.connectTo(childCircuit.res);

      // c.SUSP <- SUSP
      susp.connectTo(childCircuit.susp);

      // c.KILL < KILL v c.K2
      connectToList(killList, orKillList);
      connectToList(childCircuit.kMatrix[2], orKillList);
      connectToList(orKillList, childCircuit.killList);

      // SEL <- c.SEL
      childCircuit.sel.connectTo(sel);

      // K0 <- c.K0 V c.K2
      connectToList(childCircuit.kMatrix[0], orK0List);
      connectToList(childCircuit.kMatrix[2], orK0List);
      connectToList(orK0List, kMatrix[0]);

      // K1 < c.K1
      connectToList(childCircuit.kMatrix[1], kMatrix[1]);
      // Ki < c.Ki-1
      for (let k = 3; k < childCircuit.kMatrix.length; k++) {
	 connectToList(childCircuit.kMatrix[k], kMatrix[k - 1]);
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
   if (process.env.NEW === "true") {
      return makeTrapCircuit_new(env, astNode, childCircuit);
   } else {
      return makeTrapCircuit_orig(env, astNode, childCircuit);
   }
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Trap ...                                           */
/*---------------------------------------------------------------------*/
ast.Trap.prototype.makeCircuit = function(env, sigtable) {
   traceEnter(`${this.constructor.name}[${this.depth}]@${this.loc.pos}...`);

   const cc0 = this.children[0].makeCircuit(env, sigtable);
   //const shift = makeShiftCircuit(env, this, cc0);
   this.circuit = makeTrapCircuit(env, this, cc0);
   linkNode(this);

   traceExit(`${this.constructor.name}[${this.depth}]@${this.loc.pos}`,
	     this.circuit.kMatrix.length,
	      cc0.astNode.constructor.name
      + "@" + cc0.astNode.loc.pos + ":" + cc0.kMatrix.length);

   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeShiftCircuit ...                                             */
/*    -------------------------------------------------------------    */
/*    Fig 11.13, page 125, rules page 153                              */
/*---------------------------------------------------------------------*/
function makeShiftCircuit_orig(env, astNode, childCircuit) {
   return childCircuit;
}

function makeShiftCircuit_new(env, astNode, childCircuit) {
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode, childCircuit.kMatrix.length);

   // c.GO <- GO
   connectToList(goList, childCircuit.goList);

   // c.RES <- RES
   res.connectTo(childCircuit.res);

   // c.SUSP <- SUSP
   susp.connectTo(childCircuit.susp);

   // c.KILL <- KILL
   connectToList(killList, childCircuit.killList);

   // SEL <- c.SELL
   childCircuit.sel.connectTo(sel);

   // K0 <- c.K0
   connectToList(childCircuit.kMatrix[0], kMatrix[0]);
   // K1 <- c.K1
   connectToList(childCircuit.kMatrix[1], kMatrix[1]);
   // K2 <- 0
   const const0 = net.makeOr(astNode, "k0_const0");
   for (let i = 0; i <= l; i++) {
      const0.connectTo(kMatrix[2][i]);
   }
   // Kn+1 <- c.Kn
   for (let k = 2; k < childCircuit.kMatrix.length - 1; k++) {
      connectToList(childCircuit.kMatrix[k], kMatrix[k + 1]);
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

function makeShiftCircuit(env, astNode, childCircuit) {
   if (process.env.NEW === "true") {
      return makeShiftCircuit_new(env, astNode, childCircuit);
   } else {
      return makeShiftCircuit_orig(env, astNode, childCircuit);
   }
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Exit ...                                           */
/*---------------------------------------------------------------------*/
ast.Exit.prototype.makeCircuit = function(env, sigtable) {
   traceEnter(`${this.constructor.name}[${this.depth}]@${this.loc.pos}...returnCode=`,
	     this.returnCode);
   
   this.circuit = makeExitCircuit(env, this);
   linkNode(this);
   
   traceExit(`${this.constructor.name}[${this.depth}]@${this.loc.pos}`, this.circuit.kMatrix.length);

   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeExitCircuit ...                                              */
/*    -------------------------------------------------------------    */
/*    Fig 11.2, page 115                                               */
/*---------------------------------------------------------------------*/
function makeExitCircuit_orig(env, astNode) {
   const goList = [];
   const kMatrix = [];

   kMatrix[astNode.returnCode] = [];

   for (let i = 0; i <= astNode.depth; i++) {
      const go = net.makeOr(astNode, "go", i);

      goList[i] = go;
      kMatrix[astNode.returnCode][i] = go;
   }

   return new Circuit(astNode,
		      // --
		      goList,   // GO
		      null,     // RES
		      null,     // SUSP
		      null,     // KILL
		      // --
		      null,     // SEL
		      kMatrix); // K
}

function makeExitCircuit_new(env, astNode) {
   // circuits common interface
   const retcode = astNode.returnCode;
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode, retcode + 1);

   connectToList(goList, kMatrix[retcode]);
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

function makeExitCircuit(env, astNode) {
   if (process.env.NEW === "true") {
      return makeExitCircuit_new(env, astNode);
   } else {
      return makeExitCircuit_orig(env, astNode);
   }
}

/*---------------------------------------------------------------------*/
/*    makeSequenceCircuit ...                                          */
/*    -------------------------------------------------------------    */
/*    Fig. 11.8, page 120 and rules page 150                           */
/*---------------------------------------------------------------------*/
function makeSequenceCircuit_orig(env, astNode, childCircuits) {
   const len = childCircuits.length;
   let sel = null;
   const kMatrix = [[]];

   for (let i = 0; i < len; i++) {
      const childCircuit = childCircuits[i];

      // connect each KO incarnation of child[N] to each GO
      // incarnation of child[N + 1]
      if (i + 1 < len) {
	 const next_depth = childCircuits[i + 1].astNode.depth;
	 const next_goList = childCircuits[i + 1].goList;

	 for (let l = 0; l <= childCircuit.astNode.depth; l++) {
	    if (!childCircuit.kMatrix[0]
	       || !childCircuit.kMatrix[0][l])
	       continue;
	    let next_l = l;

	    if (l > next_depth) {
	       next_l = next_depth;
	    }
	    childCircuit.kMatrix[0][l]
	       .connectTo(next_goList[next_l]);
	 }
      }

      // connect SEL if needed
      if (childCircuit.sel) {
	 if (!sel) {
	    sel = net.makeOr(astNode, "sel");
	 }
	 childCircuit.sel.connectTo(sel);
      }

      // connects Kn where n > 0
      for (let j = 1; j < childCircuit.kMatrix.length; j++) {
	 const kList =
	    ccutils.getKListChild(astNode, ast.Sequence, childCircuit, j);

	 if (!kMatrix[j]) {
	    kMatrix[j] = [];
	 }

	 for (let l = 0; l < kList.length; l++) {
	    if (!kMatrix[j][l]) {
	       kMatrix[j][l] = net.makeOr(astNode, "buf_k" + j + "_buffer_output", l);
	    }
	    kList[l].connectTo(kMatrix[j][l]);
	 }
      }
   }

   // get K0 of last child
   kMatrix[0] =
      ccutils.getKListChild(astNode, ast.Sequence, childCircuits[len - 1], 0);

   //
   // get RES of children
   //
   const res = ccutils.getResChildren(astNode, ast.Sequence, childCircuits);

   //
   // get SUSP of children
   //
   const susp = ccutils.getSuspChildren(astNode, ast.Sequence, childCircuits);

   //
   // get KILL list of children
   //
   const killList = ccutils.killListChildren(astNode, ast.Sequence, childCircuits);

   return new Circuit(astNode,
		      // --
		      childCircuits[0].goList,  // GO
		      res,                      // RES 
		      susp,                     // SUSP
		      killList,                 // KILL
		      // --
		      sel,                      // SEL
		      kMatrix);                 // K
}

function makeSequenceCircuit_new(env, astNode, childCircuits) {
   // circuits common interface
   const kmax = Math.max.apply(undefined, childCircuits.map(c => c.kMatrix.length));
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode, kmax);
   const orSel = net.makeOr(astNode, "sel");
   const len = childCircuits.length;
   
   // debug assertion
   if (assert) childCircuits.forEach(assertCircuitInterface);

   // connect sequence GO to first child GO
   connectToList(goList, childCircuits[0].goList);
   
   // connect children SEL to the sequence SEL
   childCircuits.forEach(c => c.sel.connectTo(orSel));

   // k0 connections
   for (let i = 0; i < len; i++) {
      const c = childCircuits[i];

      if (i + 1 < len) {
	 // connect each KO incarnation of child[N] to each GO
	 // incarnation of child[N + 1]
	 connectToList(c.kMatrix[0], childCircuits[i + 1].goList)
      } else {
	 // get K0 of last child
	 connectToList(childCircuits[i].kMatrix[0], kMatrix[0]);
      }
   }
   // k n > 0 connections
   for (let k = 1; k < kMatrix.length; k++) {
      const kk_list = Array.from({length: l + 1}, (_, i) =>
	 net.makeOr(astNode, `or_k${k}/${i}`, i));

      childCircuits.forEach(c => {
	 if (c.kMatrix.length > k) {
	    connectToList(c.kMatrix[k], kk_list);
	 }
      });

      connectToList(kk_list, kMatrix[k]);
   }
			    
   // direct children connections
   childCircuits.forEach(c => {
      // RES
      res.connectTo(c.res);
      // SUSP
      susp.connectTo(c.susp);
      // KILL
      connectToList(killList, c.killList);
   });
   orSel.connectTo(sel);

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
   if (process.env.NEW === "true") {
      return makeSequenceCircuit_new(env, astNode, childCircuits);
   } else {
      return makeSequenceCircuit_orig(env, astNode, childCircuits);
   }
}
 
/*---------------------------------------------------------------------*/
/*    makeCircuit ::Sequence ...                                       */
/*---------------------------------------------------------------------*/
ast.Sequence.prototype.makeCircuit = function(env, sigtable) {
   traceEnter(`${this.constructor.name}[${this.depth}]@${this.loc.pos}...`);
   
   const ccs = this.children.map((c, i, arr) => c.makeCircuit(env, sigtable));

   this.circuit = makeSequenceCircuit(env, this, ccs);
   linkNode(this);

   traceExit(`${this.constructor.name}[${this.depth}]@${this.loc.pos}`, this.circuit.kMatrix.length,
	      "[" + ccs.map(c => c.astNode.constructor.name
		 + "@"
		 + c.astNode.loc.pos
		 + ":" + c.kMatrix.length).join(", ") + "]");

   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Pause ...                                          */
/*---------------------------------------------------------------------*/
ast.Pause.prototype.makeCircuit = function(env, sigtable) {
   this.circuit = makePauseCircuit(env, this);

   linkNode(this);
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makePauseCircuit ...                                             */
/*    -------------------------------------------------------------    */
/*    Fig 11.3, page 115 and Rules page 149                            */
/*---------------------------------------------------------------------*/
function makePauseCircuit_orig(env, astNode) {
   let goList = [];
   let killList = [];
   let kMatrix = [[], []];
   let reg = new net.RegisterNet(astNode, "reg", 0);
   let and_to_or = net.makeAnd(astNode, "and_to_or");
   let or_to_reg = net.makeOr(astNode, "or_to_reg");
   let and_to_k0 = net.makeAnd(astNode, "and_to_k0");

   and_to_or.connectTo(or_to_reg, net.FAN.STD);
   or_to_reg.connectTo(reg, net.FAN.STD);
   reg.connectTo(and_to_k0, net.FAN.STD);
   reg.connectTo(and_to_or, net.FAN.STD);
   kMatrix[0][astNode.depth] = and_to_k0;

   for (let i = 0; i <= astNode.depth; i++) {
      let go = net.makeOr(astNode, "go", i);
      goList[i] = go;
      kMatrix[1][i] = go;

      let kill = net.makeOr(astNode, "kill", i);
      killList[i] = kill;

      let and = net.makeAnd(astNode, "and", i);
      go.connectTo(and, net.FAN.STD);
      kill.connectTo(and, net.FAN.NEG);
      and.connectTo(or_to_reg, net.FAN.STD);
   }

   killList[astNode.depth].connectTo(and_to_or, net.FAN.NEG);

   return new Circuit(astNode,
		      // --
		      goList,     // GO
		      and_to_k0,  // RES
		      and_to_or,  // SUSP
		      killList,   // KILL
		      // --
		      reg,        // SEL
		      kMatrix);   // K
}

function makePauseCircuit_new(env, astNode) {
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode, 2);

   const reg = new net.RegisterNet(astNode, "reg", 0);
   const reglhs = net.makeAnd(astNode, "reg_or_lhs");
   const regrhs = net.makeOr(astNode, "reg_or_rhs");

   // reglhs = (SUS ^ REG ^ !KILL[l])
   susp.connectTo(reglhs);
   reg.connectTo(reglhs);
   killList[l].connectTo(reglhs, net.FAN.NEG);

   // regrhs = V (GO[i] ^ !KILL[i])
   for (let i = 0; i <= l; i++) {
      // GO[i] ^ !KILL[i]
      const and = net.makeAnd(astNode, "reg_or_rhs_and", i);
      goList[i].connectTo(and);
      killList[i].connectTo(and, net.FAN.NEG);
      and.connectTo(regrhs);
   }

   // REG := reglhs v regrhs
   const or = net.makeOr(astNode, "reg_or")
   reglhs.connectTo(or);
   regrhs.connectTo(or);
   or.connectTo(reg);

   // SEL <= REG
   reg.connectTo(sel);

   // K[1, i] <= GO[i]
   connectToList(goList, kMatrix[1]);
   
   // K[0,l] <= REG ^ RES
   const and = net.makeAnd(astNode, "and_k0");
   reg.connectTo(and);
   res.connectTo(and);
   and.connectTo(kMatrix[0][l]);
   
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

function makePauseCircuit(env, astNode) {
   if (process.env.NEW === "true") {
      return makePauseCircuit_new(env, astNode);
   } else {
      return makePauseCircuit_orig(env, astNode);
   }
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
   return this.circuit = makeAwaitCircuit(env, this);
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
   this.children[0].makeCircuit(env, sigtable);
   const cloopeach = makeLoopeachCircuit(env, this, this.children[0].circuit);
   const cawait = makeAwaitCircuit(env, this);
   this.circuit = makeSequenceCircuit(env, this, [cawait, cloopeach]);

   linkNode(this);
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::LoopEach ...                                       */
/*---------------------------------------------------------------------*/
ast.LoopEach.prototype.makeCircuit = function(env, sigtable) {
   this.children[0].makeCircuit(env, sigtable);
   this.circuit = makeLoopeachCircuit(env, this, this.children[0].circuit);

   linkNode(this);
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Loop ...                                           */
/*---------------------------------------------------------------------*/
ast.Loop.prototype.makeCircuit = function(env, sigtable) {
   this.children[0].makeCircuit(env, sigtable);
   this.circuit = makeLoopCircuit(env, this, this.children[0].circuit);

   linkNode(this);
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeLoopCircuit ...                                              */
/*    -------------------------------------------------------------    */
/*    Fig 11.9, page 121 and rules page 151                            */
/*---------------------------------------------------------------------*/
function makeLoopCircuit_orig(env, astNode, childCircuit) {
   const depth1 = astNode.depth;
   const depth2 = childCircuit.astNode.depth;
   const goList = [];
   const kMatrix = [[]];

   for (let l = 0; l <= depth1; l++) {
      let or = net.makeOr(astNode, "go", l);

      or.connectTo(childCircuit.goList[l]);
      goList[l] = or;
   }

   //
   // Error on instantaneous loop, and connect K0[depth2] on K0[depth1]
   //
   for (let l = 0; l <= depth2; l++) {
      if (childCircuit.kMatrix[0]
	 && childCircuit.kMatrix[0][l]
	 && (depth2 == 0 || l < depth2))
	 childCircuit.kMatrix[0][l].connectTo(
	    new net.ActionNet(astNode, "error", l,
			      function() {
				 throw error.TypeError(
				    "Instantaneous loop.", astNode.loc) },
			      []),
	    net.FAN.STD);
   }

   if (childCircuit.kMatrix[0] && childCircuit.kMatrix[0][depth2]) {
      childCircuit.kMatrix[0][depth2]
	 .connectTo(goList[depth1]);
   }

   for (let k = 1; k < childCircuit.kMatrix.length; k++) {
      kMatrix[k] = ccutils.getKListChild(astNode, ast.Loop, childCircuit, k);
   }

   const killList = ccutils.killListChildren(astNode, ast.Loop, [childCircuit]);

   return new Circuit(astNode,
		      // --
		      goList,            // GO
		      childCircuit.res,  // RES
		      childCircuit.susp, // SUSP
		      killList,          // KILL
		      // --
		      childCircuit.sel,  // SEL
		      kMatrix);          // K
}

function makeLoopCircuit_new(env, astNode, childCircuit) {
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode, childCircuit.kMatrix.length);
   const l2 = childCircuit.astNode.depth;

   // Error on instantaneous loop, and connect K0[depth2] on K0[depth1]
   for (let l = 0; l <= l2; l++) {
      if (childCircuit.kMatrix[0][l].fanoutList.length > 0
	 && (l2 == 0 || l < l2))
	 childCircuit.kMatrix[0][l].connectTo(
	    new net.ActionNet(astNode, "error", l,
			      function() {
				 throw error.TypeError(
				    "Instantaneous loop.", astNode.loc) },
			      []));
   }

   // c.GO[l] <- GO v c.k0[l]
   const or = net.makeOr(astNode, "or_go_k0");
   goList[l].connectTo(or);
   childCircuit.kMatrix[0][l2].connectTo(or);
   or.connectTo(childCircuit.goList[l]);
   
   // c.Gn < GOn, for n < l
   for (let g = 0; g < l; g++) {
      goList[g].connectTo(childCircuit.goList[g]);
   }
   
   // c.RES <- RES
   res.connectTo(childCircuit.res);
   
   // c.SUSP <- c.SUSP
   susp.connectTo(childCircuit.susp);
   
   // c.KILL <- KILL
   connectToList(killList, childCircuit.killList);
   
   // SEL <- c.SEL
   childCircuit.sel.connectTo(sel);
   
   // K0 <- 0
   const const0 = net.makeOr(astNode, "k0_const0");
   for (let i = 0; i <= l; i++) {
      const0.connectTo(kMatrix[0][i]);
   }
   
   // Kn <- c.Kn
   for (let k = 1; k < childCircuit.kMatrix.length; k++) {
      connectToList(childCircuit.kMatrix[k], kMatrix[k]);
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

function makeLoopCircuit(env, astNode, childCircuits) {
   if (process.env.NEW === "true") {
      return makeLoopCircuit_new(env, astNode, childCircuits);
   } else {
      return makeLoopCircuit_orig(env, astNode, childCircuits);
   }
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Nothing ...                                        */
/*---------------------------------------------------------------------*/
ast.Nothing.prototype.makeCircuit = function(env, sigtable) {
   traceEnter(`${this.constructor.name}[${this.depth}]@${this.loc.pos}...`);
   
   this.circuit = makeNothingCircuit(env, this);
   linkNode(this);
   
   traceExit(`${this.constructor.name}[${this.depth}]@${this.loc.pos}`, this.circuit.kMatrix.length);
   
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeNothingCircuit ...                                           */
/*---------------------------------------------------------------------*/
function makeNothingCircuit_orig(env, astNode) {
   const goList = [];
   const kMatrix = [[]];

   for (let i = 0; i <= astNode.depth; i++) {
      const go = net.makeOr(astNode, "go", i);

      goList[i] = go;
      kMatrix[0][i] = go;
   }

   return new Circuit(astNode,
		      // ---
		      goList,   // GO
		      null,     // RES
		      null,     // SUSP
		      null,     // KILL
		      // ---
		      null,     // SEL
		      kMatrix); // K
}

function makeNothingCircuit_new(env, astNode) {
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode, 2);

   connectToList(goList, kMatrix[0]);

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

function makeNothingCircuit(env, astNode, childCircuits) {
   if (process.env.NEW === "true") {
      return makeNothingCircuit_new(env, astNode);
   } else {
      return makeNothingCircuit_orig(env, astNode);
   }
}
 
/*---------------------------------------------------------------------*/
/*    makeCircuit ::Atom ...                                           */
/*---------------------------------------------------------------------*/
ast.Atom.prototype.makeCircuit = function(env, sigtable) {
   this.circuit = makeAtomCircuit(env, this, sigtable);

   linkNode(this);
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeAtomCircuit ...                                              */
/*---------------------------------------------------------------------*/
function makeAtomCircuit_orig(env, astNode, sigtable) {
   const goList = [];
   const kMatrix = [[]];
   const atomFunc = astNode.func;
   const frame = astNode.frame;
   const func = frame ? function() { atomFunc(frame) } : atomFunc;

   for (let i = 0; i <= astNode.depth; i++) {
      bindSigAccessorList(env, astNode.accessor_list, astNode);

      // GB 1/6/19 : fixed big bug by Colin, the action gate was not
      // connected to anything and could be executed at any timed!
      // kMatrix[0] must contain the action nets, not the go nets!
      const goNet = net.makeOr(astNode, "go", i);
      const actionNet = new net.ActionNet(astNode, "action", i,
					  func, astNode.accessor_list);
      goNet.connectTo(actionNet);
      goList[i] = goNet;
      kMatrix[0][i] = actionNet
   }

   return new Circuit(astNode,
		      // --
		      goList,   // GO
		      null,     // RES
		      null,     // SUSP
		      null,     // KILL
		      // --
		      null,     // SEL
		      kMatrix); // K
}

function makeAtomCircuit_new(env, astNode, sigtable) {
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode, 2);
   const atomFunc = astNode.func;
   const frame = astNode.frame;
   const func = frame ? function() { atomFunc(frame) } : atomFunc;

   for (let i = 0; i <= l; i++) {
      const actionNet =
	 new net.ActionNet(astNode, "action", i, func, astNode.accessor_list);

      goList[i].connectTo(actionNet);
      actionNet.connectTo(kMatrix[0][i]);
      
      bindSigAccessorList(env, astNode.accessor_list, astNode);
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

function makeAtomCircuit(env, astNode, sigtable) {
   if (process.env.NEW === "true") {
      return makeAtomCircuit_new(env, astNode, sigtable);
   } else {
      return makeAtomCircuit_orig(env, astNode, sigtable);
   }
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Suspend ...                                        */
/*---------------------------------------------------------------------*/
ast.Suspend.prototype.makeCircuit = function(env, sigtable) {
   traceEnter(`${this.constructor.name}[${this.depth}]@${this.loc.pos}...`);
   
   const cc0 = this.children[0].makeCircuit(env, sigtable);
   this.circuit = makeSuspendCircuit(env, this, cc0);
   linkNode(this);

   traceExit(`${this.constructor.name}[${this.depth}]@${this.loc.pos}`, this.circuit.kMatrix.length,
	      cc0.astNode.constructor.name
      + "@" + cc0.astNode.loc.pos + ":" + cc0.kMatrix.length);

   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeSuspendCircuit ...                                           */
/*    -------------------------------------------------------------    */
/*    Fig 11.6, page 119, rules page 150                               */
/*---------------------------------------------------------------------*/
function makeSuspendCircuit_orig(env, astNode, childCircuit) {
   const and1 = net.makeAnd(astNode, "and1_sel_res");
   const and2 = net.makeAnd(astNode, "and2_negtest_and1");
   const and3 = net.makeAnd(astNode, "and3_test_and1");
   const or1 = net.makeOr(astNode, "or1_susp_and3");
   const or2 = net.makeOr(astNode, "or2_k1_and3");
   const kMatrix = [];

   and1.connectTo(and2);
   and1.connectTo(and3);
   and3.connectTo(or1);
   and3.connectTo(or2);

   if (childCircuit.sel) {
      childCircuit.sel.connectTo(and1);
   }

   if (childCircuit.res) {
      and2.connectTo(childCircuit.res);
   }

   if (childCircuit.susp) {
      or1.connectTo(childCircuit.susp);
   }

   const e = makeExpressionNet(env, astNode, astNode.depth);
   and1.connectTo(e);
   e.connectTo(and3);
   e.connectTo(and2, net.FAN.NEG);

   for (let k = 0; k < childCircuit.kMatrix.length; k++) {
      kMatrix[k] =
	 ccutils.getKListChild(astNode, ast.Suspend, childCircuit, k);
   }

   if (kMatrix.length > 1) {
      if (kMatrix[1][astNode.depth]) {
      	 or2.connectTo(kMatrix[1][astNode.depth]);
      }
   }

   const kills =
      ccutils.killListChildren(astNode, ast.Suspend, [childCircuit]);

   return new Circuit(astNode,
		      // --
		      childCircuit.goList,  // GO
		      and1,                 // RES
		      or1,                  // SUSP
		      kills,                // KILL
		      // --
		      childCircuit.sel,     // SEL
		      kMatrix);             // K
}

function makeSuspendCircuit_new(env, astNode, childCircuit) {
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode, childCircuit.kMatrix.length);
   
   const s = makeExpressionNet(env, astNode, astNode.depth);
   const res_and_sel = net.makeAnd(astNode, "res_and_sel");
   const res_and_sel_and_s = net.makeAnd(astNode, "res_and_sel_and_s");
   const res_and_sel_and_non_s = net.makeAnd(astNode, "res_and_sel_and_non_s");

   // res_and_sel
   res.connectTo(res_and_sel);
   childCircuit.sel.connectTo(res_and_sel);

   // res_and_sel_and_s
   res_and_sel.connectTo(res_and_sel_and_s);
   s.connectTo(res_and_sel_and_s);

   // res_and_sel_and_non_s
   res_and_sel.connectTo(res_and_sel_and_non_s);
   s.connectTo(res_and_sel_and_non_s, net.FAN.NEG);
   
   // c.GO <- GO
   connectToList(goList, childCircuit.goList);

   // c.RES <- !s ^ RES ^ c.SEL
   res_and_sel_and_non_s.connectTo(childCircuit.res);
   
   // c,SUSP <- SUSP v (s ^ RES ^ c.SEL)
   const c_susp = net.makeOr(astNode, "c_susp");
   susp.connectTo(c_susp);
   res_and_sel_and_s.connectTo(c_susp);
   c_susp.connectTo(childCircuit.susp);
   
   // c,KILL <- KILL
   connectToList(killList, childCircuit.killList);

   // SEL <- c.SEL
   childCircuit.sel.connectTo(sel);
   
   // K0 <- c.K0
   connectToList(childCircuit.kMatrix[0], kMatrix[0]);

   // k1 <- c.K1 v s ^ RES ^ c.SEL
   const k1l = net.makeOr(astNode, `k1/${l}`);
   for (let i = 0; i < l; i++) {
      childCircuit.kMatrix[1][i].connectTo(kMatrix[1][i]);
   }
   res_and_sel_and_s.connectTo(k1l);
   childCircuit.kMatrix[1][l].connectTo(k1l);
   k1l.connectTo(kMatrix[1][l]);

   // Kn <- c.Kn, n >= 2
   for (let k = 2; k < childCircuit.kMatrix.length; k++) {
      connectToList(childCircuit.kMatrix[k], kMatrix[k]);
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

function makeSuspendCircuit(env, astNode, childCircuit) {
   if (process.env.NEW === "true") {
      return makeSuspendCircuit_new(env, astNode, childCircuit);
   } else {
      return makeSuspendCircuit_orig(env, astNode, childCircuit);
   }
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::WeakAbort ...                                      */
/*---------------------------------------------------------------------*/
ast.WeakAbort.prototype.makeCircuit = function(env, sigtable) {
   this.circuit = this.children[0].makeCircuit(env, sigtable);

   linkNode(this);
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Abort ...                                          */
/*---------------------------------------------------------------------*/
ast.Abort.prototype.makeCircuit = function(env, sigtable) {
   traceEnter(`${this.constructor.name}[${this.depth}]@${this.loc.pos}...`);

   const cc = this.children[0].makeCircuit(env, sigtable);
   this.circuit = makeAbortCircuit(env, this, cc, false);
   linkNode(this);
   
   traceExit(`${this.constructor.name}[${this.depth}]@${this.loc.pos}`, this.circuit.kMatrix.length,
	      cc.astNode.constructor.name
      + "@" + cc.astNode.loc.pos + ":" + cc.kMatrix.length);
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeAbortNonImmediateCircuit ...                                 */
/*    -------------------------------------------------------------    */
/*    Fig 11.7, page 120 and Rules page 150                            */
/*---------------------------------------------------------------------*/
function makeAbortNonImmediateCircuit_orig(env, astNode, childCircuit) {
   const and1 = net.makeAnd(astNode, "and1_sel_res");
   const and2 = net.makeAnd(astNode, "and2_negtest_res");
   const and3 = net.makeAnd(astNode, "and3_test_res");
   const or = net.makeOr(astNode, "or_and3_k0");
   const goList = [];
   const kMatrix = [[]];

   for (let l = 0; l <= astNode.depth; l++) {
      const go = net.makeOr(astNode, "go", l);

      go.connectTo(childCircuit.goList[l]);
      goList[l] = go;
   }

   //
   // Special case for Exec - GB caisse ?
   //
   if (astNode instanceof ast.Exec) {
      astNode.exec_status.callback_wire.connectTo(and3);
      astNode.exec_status.callback_wire.connectTo(and2, net.FAN.NEG);
   } else if (astNode.func_count) {
      //
      // If a counter must be created, AND and AND-not gates must be
      // connected only on the counter output (and not on expr test)
      //
      const decr_list = [];

      decr_list[0] = makeExpressionNet(env, astNode, astNode.depth);
      and1.connectTo(decr_list[0]);
      decr_list[1] = and1;
      const { cnt, reset } = makeCounterNet(env, astNode);
      goList.forEach(n => n.connectTo(reset));
      decr_list.forEach(n => n.connectTo(cnt));
      cnt.connectTo(and3);
      cnt.connectTo(and2, net.FAN.NEG);
   } else {
      // 
      // normal test expression controlling the abort statement
      //
      const s = makeExpressionNet(env, astNode, astNode.depth);
      and1.connectTo(s);
      s.connectTo(and3);
      s.connectTo(and2, net.FAN.NEG);
   }

   and1.connectTo(and2);
   and1.connectTo(and3);
   and3.connectTo(or);

   //
   // connect SEL of subcircuit
   //
   if (childCircuit.sel) {
      childCircuit.sel.connectTo(and1);
   }

   //
   // connect to RES of subcircuit
   //
   if (childCircuit.res) {
      and2.connectTo(childCircuit.res);
   }

   //
   // connect K0 on depth
   //
   const k0 = childCircuit.kMatrix[0][childCircuit.astNode.depth];
   if (k0) {
      k0.connectTo(or);
   }
   // MS 30jan2025, I don't understand how (or why) this implement
   // the rule of page 150!
   kMatrix[0][astNode.depth] = or;

   //
   // connect K0 on surface and Kn
   //
   
   for (let l = 0; l < astNode.depth; l++) {
      kMatrix[0][l] = childCircuit.kMatrix[0][l];
   }

   for (let k = 1; k < childCircuit.kMatrix.length; k++) {
      kMatrix[k] =
	 ccutils.getKListChild(astNode, ast.Abort, childCircuit, k);
   }

   const kills =
      ccutils.killListChildren(astNode, ast.Abort, [childCircuit]);

   return new Circuit(astNode,
		      // --
		      goList,           // GO
		      and1,              // RES
		      childCircuit.susp, // SUSP
		      kills,             // KILL
		      // --
		      childCircuit.sel,  // SEL
		      kMatrix);         // K
}
   
function makeAbortNonImmediateCircuit_new(env, astNode, childCircuit) {
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode, childCircuit.kMatrix.length);
   let s;

   // debug assertion
   if (assert) assertCircuitInterface(childCircuit);
   
   if (astNode instanceof ast.Exec) {
      s = astNode.exec_status.callback_wire;
   } else if (astNode.func_count) {
      // counter test expression
      // when a counter must be created, AND and AND-not gates must be
      // connected only on the counter output (and not on expr test)
      s = makeExpressionNet(env, astNode, l);
      const { cnt, reset } = makeCounterNet(env, astNode);
      
      res.connectTo(e);
      console.log("TODO");
   } else {
      // regular test expression
      s = makeExpressionNet(env, astNode, l);
   }
   
   const and = net.makeAnd(astNode, "res_and_sel");

   res.connectTo(and);
   and.connectTo(s);

   childCircuit.sel.connectTo(and);
   childCircuit.sel.connectTo(sel);
   
   // NRES = RES ^ !S[l(s)]
   const nres = net.makeAnd(astNode, "nres");
   and.connectTo(nres);
   s.connectTo(nres, net.FAN.NEG);

   nres.connectTo(childCircuit.res);
   
   // K[0,l] <= RES ^ S[l(s)]
   const k0l = net.makeAnd(astNode, "k0l");
   const k0 = net.makeOr(astNode, "k0");
   and.connectTo(k0l);
   s.connectTo(k0l);

   k0l.connectTo(k0);
   childCircuit.kMatrix[0][l].connectTo(k0);
   
   k0.connectTo(kMatrix[0][l]);

   // direct connections from the parent to the child circuit
   connectToList(goList, childCircuit.goList);
   connectToList(killList, childCircuit.killList);
   susp.connectTo(childCircuit.susp);

   connectToList(childCircuit.kMatrix[0], kMatrix[0]);
   for (let k = 1; k < childCircuit.kMatrix.length; k++) {
      connectToList(childCircuit.kMatrix[k], kMatrix[k]);
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
   if (process.env.NEW === "true") {
      return makeAbortNonImmediateCircuit_new(env, astNode, childCircuit);
   } else {
      return makeAbortNonImmediateCircuit_orig(env, astNode, childCircuit);
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
   this.circuit = makeEmitIfCircuit(env, this);

   linkNode(this);
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeEmit ...                                                     */
/*    -------------------------------------------------------------    */
/*    Fig 11.4, page 116                                               */
/*---------------------------------------------------------------------*/
function makeEmitCircuit_orig(env, astNode, signame) {
   const goList = [];
   const kMatrix = [[]];

   for (let i = 0; i <= astNode.depth; i++) {
      const go = net.makeOr(astNode, signame + "_go", i);
      const sig = getSignalObject(env, signame, astNode);
      const sig_gate = signalGate(sig, i);

      go.connectTo(sig_gate);
      goList[i] = go;

      // Special case for exec
      if (astNode instanceof ast.Exec) {
	 astNode.signal = sig;
	 const exec_emission_func = function() {
	    // MS 20jan2025: fix, exec signals are sent during the
	    // machine.update operation (see machine.js)
	    // This fixes causal-artist-player.hh.js, depnowval.hh.js,
	    // and depnowval-local.hh.js bugs
	    // sig.set_value(astNode.exec_status.value, i, astNode.loc);
	    astNode.exec_status.value = undefined;
	 }

	 const anet = new net.ActionNet(
	    astNode, "_exec_return_sig",
	    i, exec_emission_func, []);

	 go.connectTo(anet);
	 kMatrix[0][i] = anet;
      } else {
	 // Warning: the key must be signame and *not* sig.name, in
	 // case of bouded signals.
	 astNode.signal_map[signame] = sig;

	 if (astNode.func || astNode.accessor_list.length > 0) {
	    bindSigAccessorList(env, astNode.accessor_list, astNode);
	    const expr = new net.SignalExpressionNet(
	       astNode, sig, signame + "_signal_expr", i,
	       astNode.func, astNode.accessor_list);
	    go.connectTo(expr);
	    kMatrix[0][i] = expr;
	 } else {
	    kMatrix[0][i] = go;
	 }
      }
   }

   return new Circuit(astNode,
		      // --
		      goList,    // GO
		      null,      // RES
		      null,      // SUSP
		      null,      // KILL
		      // --
		      null,      // SEL
		      kMatrix);  // K
}

function makeEmitCircuit_new(env, astNode, signame) {
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode, 2);

   for (let i = 0; i <= astNode.depth; i++) {
      const sig = getSignalObject(env, signame, astNode);
      const sig_gate = signalGate(sig, i);

      goList[i].connectTo(sig_gate);

      // exec nodes
      if (astNode instanceof ast.Exec) {
	 kMatrix[0][i] = go;
	 astNode.signal = sig;
	 const exec_emission_func = function() {
	    // MS 20jan2025: fix, exec signals are sent during the
	    // machine.update operation (see machine.js)
	    // This fixes causal-artist-player.hh.js, depnowval.hh.js,
	    // and depnowval-local.hh.js bugs
	    // sig.set_value(astNode.exec_status.value, i, astNode.loc);
	    astNode.exec_status.value = undefined;
	 }

	 const anet = new net.ActionNet(
	    astNode, "_exec_return_sig",
	    i, exec_emission_func, []);

	 goList[i].connectTo(anet);
	 anet.connectTo(kMatrix[0][i]);
      } else {
	 // regular nodes
	 // Warning: the key must be signame and *not* sig.name, in
	 // case of bouded signals.
	 astNode.signal_map[signame] = sig;

	 if (astNode.func || astNode.accessor_list.length > 0) {
	    bindSigAccessorList(env, astNode.accessor_list, astNode);
	    const expr = new net.SignalExpressionNet(
	       astNode, sig, signame + "_signal_expr", i,
	       astNode.func, astNode.accessor_list);
	    goList[i].connectTo(expr);
	    expr.connectTo(kMatrix[0][i]);
	 } else {
	    goList[i].connectTo(kMatrix[0][i]);
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
/*    makeEmitCircuit ...                                              */
/*---------------------------------------------------------------------*/
function makeEmitCircuit(env, astNode, signame) {
   if (process.env.NEW === "true") {
      return makeEmitCircuit_new(env, astNode, signame);
   } else {
      return makeEmitCircuit_orig(env, astNode, signame);
   }
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
   const cpause = makePauseCircuit(env, this);
   const cemit = makeEmitIfCircuit(env , this);
   const cseq = makeSequenceCircuit(env, this, [cemit, cpause]);
   this.circuit = makeLoopCircuit(env, this, cseq);

   linkNode(this);
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::If ...                                             */
/*---------------------------------------------------------------------*/
ast.If.prototype.makeCircuit = function(env, sigtable) {
   const cc0 = this.children[0].makeCircuit(env, sigtable);
   const cc1 = this.children[1].makeCircuit(env, sigtable);
   this.circuit = makeIfCircuit(env, this, [cc0, cc1]);

   linkNode(this);
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeIfCircuit ...                                                */
/*    -------------------------------------------------------------    */
/*    Fig 11.5, page 117                                               */
/*---------------------------------------------------------------------*/
function makeIfCircuit(env, astNode, childCircuits) {
   const goList = [];
   let sel = null;

   for (let i = 0; i <= astNode.depth; i++) {
      const go = net.makeOr(astNode, "go", i);
      const and_then = net.makeAnd(astNode, "and_then", i);
      const and_else = net.makeAnd(astNode, "and_else", i);

      if (astNode.not) {
 	 const s = makeExpressionNet(env, astNode, i);
	 go.connectTo(s);
	 s.connectTo(and_else);
	 s.connectTo(and_then, net.FAN.NEG);
      } else {
	 const s = makeExpressionNet(env, astNode, i);
	 go.connectTo(s);
	 s.connectTo(and_then);
	 s.connectTo(and_else, net.FAN.NEG);
      }

      go.connectTo(and_then);
      go.connectTo(and_else);

      and_then.connectTo(childCircuits[0].goList[i]);
      and_else.connectTo(childCircuits[1].goList[i]);

      goList[i] = go;
   }

   for (let i = childCircuits.length - 1; i >= 0; i--) {
      if (childCircuits[i].sel) {
	 if (!sel) {
	    sel = net.makeOr(astNode, "sel");
	 }
	 childCircuits[i].sel.connectTo(sel);
      }
   }

   //
   // get RES of children
   //
   const res = ccutils.getResChildren(astNode, ast.If, childCircuits);

   //
   // get SUSP of children
   //
   const susp = ccutils.getSuspChildren(astNode, ast.If, childCircuits);

   //
   // get KILL list of children
   //
   const killList = ccutils.killListChildren(astNode, ast.If, childCircuits);

   //
   // get Kn list of children, make union of then
   //
   const kMatrix = [];
   const kMatrix_then = childCircuits[0].kMatrix;
   const kMatrix_else = childCircuits[1].kMatrix;
   const max_k = Math.max(kMatrix_then.length, kMatrix_else.length) - 1;
   for (let ki = 0; ki <= max_k; ki++) {
      const k_list_then = ccutils.getKListChild(astNode, ast.If,
						childCircuits[0], ki);
      const k_list_else = ccutils.getKListChild(astNode, ast.If,
						childCircuits[1], ki);
      kMatrix[ki] = [];
      for (let kl = 0; kl <= astNode.depth; kl++) {
	 const union = net.makeOr(astNode, "k" + ki + "_union_buffer", ki);
	 kMatrix[ki][kl] = union;
	 if (k_list_then[kl]) {
	    k_list_then[kl].connectTo(union);
	 }
	 if (k_list_else[kl]) {
	    k_list_else[kl].connectTo(union);
	 }
      }
   }

   return new Circuit(astNode, goList, res, susp, killList, sel,
		      kMatrix);
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Halt ...                                           */
/*---------------------------------------------------------------------*/
ast.Halt.prototype.makeCircuit = function(env, sigtable) {
   this.circuit = makeHaltCircuit(this, this);

   linkNode(this);
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

      // abort of await use this wire instead of signal wire to know
      // when user routine is done
      callback_wire: net.makeOr(this, "callback_wire"),

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
      await_node.goList[l].connectTo(start);

      const kill = new net.ActionNet(
	 this, "kill", l, function() {
	    exec_status.kill = true;
	 }, []);
      await_node.killList[l].connectTo(start, net.FAN.NEG);
      await_node.killList[l].connectTo(kill);

      //
      // kill handler must be called in case of abortion
      //
      const andDetectAbort = new net.ActionNet(
	 this, "abort", l, function() {
	    exec_status.kill = true;
	 }, []);
      await_node.res.connectTo(andDetectAbort, net.FAN.NEG);
      await_node.susp.connectTo(andDetectAbort, net.FAN.NEG);
      await_node.sel.connectTo(andDetectAbort);

      const susp = new net.ActionNet(
	 this, "susp", l, function() {
   	    exec_status.suspended = true;
	 }, []);
      await_node.susp.connectTo(susp);
      await_node.sel.connectTo(susp);

      const res = new net.ActionNet(
	 this, "res", l, function() {
   	    exec_status.suspended = false;
	 }, []);
      await_node.res.connectTo(res);
      await_node.sel.connectTo(res);

      bindSigAccessorList(env, this.accessor_list, this);
      signal.runtimeSignalAccessor(this, this.accessor_list, l);
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

      linkNode(this);
      return this.circuit;
   }
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Local ...                                          */
/*    -------------------------------------------------------------    */
/*    Fig 11.14, page 125                                              */
/*---------------------------------------------------------------------*/
ast.Local.prototype.makeCircuit = function(env, sigtable) {
   let sig;
   const goList = [];
   const child = this.children[0];
   const res = net.makeOr(this, "res_buf");

   //
   // As child circuit can use signal declared in this local, we need to
   // build them first. As we don't know yet if the child circuit uses
   // k1, kill or susp, we have to use buffers...
   //
   const kMatrix = [[], []];
   const killList = [];
   const susp = net.makeOr(this, "susp_buf");
   const initList = [];

   for (let i = 0; i <= this.depth; i++) {
      kMatrix[1][i] = net.makeOr(this, "k1_output_buffer", i);
      killList[i] = net.makeOr(this, "kill_output_buffer", i);
      goList[i] = net.makeOr(this, "go", i);
   }

   // Generation of signal in the Local scope.  For now, Only
   // unbound signals are created, and `accessibility` is ignored.
   this.sigDeclList.forEach(sigprop => {
      if (!sigprop.alias) {
	 const s = new signal.Signal(this, sigprop, ast.Local, 
				     new net.RegisterNet(this, sigprop.name + "_pre_reg", 0),
				     kMatrix[1], killList, susp);

	 sigprop.signal = s;
	 this.machine.local_signal_list.push(s);

	 //
	 // Reinstantiation of local signal. Involves the call to
	 // reset function and the call of init function (which has
	 // dependencies). Same of reinit (happens on RES, or GO if no
	 // init provided).
	 //
	 for (let l = 0; l <= this.depth; l++) {
	    bindSigAccessorList(env, s.init_accessor_list, this);
	    const action_init = new net.ActionNet(
	       this, "init", l, function() {
		  signal.create_scope.call(
		     this, s, l);
	       }, s.init_accessor_list);
	    goList[l].connectTo(action_init);
	    initList.push(action_init);

	    bindSigAccessorList(env, s.reinit_accessor_list, this);
	    const action_reinit = new net.ActionNet(
	       this, "reinit", l, function() {
		  signal.resume_scope.call(
		     this, s, l);
	       }, s.reinit_accessor_list);
	    res.connectTo(action_reinit);
	 }
      } else {
	 //
	 // The signal is aliased. Hence, we have to reference the
	 // signal attribute of the signal property to the signal
	 // object. This attribute is empty when the signal property
	 // comes from module used in a run statement.
	 //
	 if (!sigprop.signal) {
	    sigprop.signal = getSignalObject(env, sigprop.alias, this);
	 }
      }
   });

   // Child circuit iteration and connexion
   child.makeCircuit(env.concat(this.sigDeclList), sigtable);

   //
   // Connect killList buffers to nested killList buffers
   //
   const nestedKillList = ccutils.killListChildren(this, ast.Local, [child.circuit]);
   if (nestedKillList) {
      for (let k in killList) {
	 killList[k].connectTo(nestedKillList[k]);
      }
   }

   //
   // connect child circuit to buffers res, k1, kill and susp
   //
   if (child.circuit.res) {
      res.connectTo(child.circuit.res);
   }

   if (child.circuit.susp) {
      susp.connectTo(child.circuit.susp);
   }

   kMatrix[0] = ccutils.getKListChild(this, ast.Local, child.circuit, 0);
   for (let i = 2; i < child.circuit.kMatrix.length; i++) {
      kMatrix[i] = ccutils.getKListChild(this, ast.Local, child.circuit, i)
   }

   if (child.circuit.kMatrix[1]) {
      for (let i = 0; i < child.circuit.kMatrix[1].length; i++) {
	 const lvl = i > this.depth ? this.depth : i;
	 child.circuit.kMatrix[1][i].connectTo(kMatrix[1][lvl]);
      }
   }

   //
   // connect go to child
   //
   // Actually, signal initialization net (if exists) is connected to
   // child, this ensure that local signal is initialized before
   // starting the body.
   //
   // Another possibilitie would be to add the initialization net to
   // the dependency list of the signal, but it may lead to cycle
   // error (making an embed emission to depends of the go, but also
   // the local k0 depends of the emission...)
   //
   for (let l = 0; l <= this.depth; l++) {
      const go = initList[l] ? initList[l] : goList[l];
      go.connectTo(child.circuit.goList[l]);
   }

   this.circuit = new Circuit(this, goList, res, susp,
			      killList, child.circuit.sel, kMatrix);
   linkNode(this);

   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Module ...                                         */
/*    -------------------------------------------------------------    */
/*    Fig 11.15, page 126                                              */
/*---------------------------------------------------------------------*/
ast.Module.prototype.makeCircuit = function(env, sigtable) {
   const boot_reg = new net.RegisterNet(this, "global_boot_register", 0);
   const const0 = net.makeOr(this, "global_const0");
   const const1 = net.makeOr(this, "global_const0");
   const0.sweepable = false;
   const1.sweepable = false;
   
   //
   // It's mandatory that `boot_reg` propagates BEFORE `const0` the
   // first reaction. It's OK with current known list, but keep that
   // in mind. (we also could make a dependency of `boot_reg` to
   // `const0`?)
   //
   const0.connectTo(boot_reg);
   this.machine.boot_reg = boot_reg;

   //
   // Generation of global signal
   //
   const signalsReady = net.makeOr(this, "global_signals_ready");
   boot_reg.connectTo(signalsReady);

   // nenv must be constructed incrementally in order to support
   // initialization dependencies
   const nenv = env;

   for (let i = 0; i < this.sigDeclList.length; i++) {
      const sigdecl = this.sigDeclList[i];
      const axs = sigtable.get(sigdecl.name);
      const pre_reg = axs?.get_pre
	 ? new net.RegisterNet(this, sigdecl.name + "_pre_reg", 0)
	 : null;
      const s = new signal.Signal(this, sigdecl, ast.Module, pre_reg, null, null, null);

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
	 const0.connectTo(action_reinit, net.FAN.NEG);
	 action_reinit.connectTo(signalsReady, net.FAN.DEP);
      } else if (s.init_func) {
	 bindSigAccessorList(env, s.init_accessor_list, this);
	 const action_init = new net.ActionNet(
	    this, "init", 0, function() {
	       signal.create_scope.call(this, s, 0);
	    }, s.init_accessor_list);
	 boot_reg.connectTo(action_init);
	 action_init.connectTo(signalsReady, net.FAN.DEP);
      }
   }

   // compile the whole module
   if (this.children.length > 1)
      throw new Error("too many children!");

   const child = this.children[0];

   child.makeCircuit(nenv, sigtable);

   // signals connections
   signalsReady.connectTo(child.circuit.goList[0]);

   // allocate and connect global sel and res wires
   const global_sel = net.makeOr(this, "global_sel");
   const global_res = net.makeAnd(this, "global_res");
   
   boot_reg.connectTo(global_res, net.FAN.NEG);
   global_sel.connectTo(global_res);
   
   // connect child circuit to the module
   if (child.circuit.res) {
      global_res.connectTo(child.circuit.res);
   }

   if (child.circuit.sel) {
      child.circuit.sel.connectTo(global_sel);
   }
   
   if (child.circuit.killList) {
      child.circuit.killList.forEach(kl => const0.connectTo(kl));
   }

   if (child.circuit.goList) {
      const0.connectTo(child.circuit.goList[1]);
   }

   if (child.circuit.susp) {
      const0.connectTo(child.circuit.susp);
   }

   // Connect sel, K0 (level 0) and K1 (level 0)
   this.machine.sel = child.circuit.sel;
   if (child.circuit.kMatrix[0]) {
      const i0 = child.circuit.kMatrix[0][0];
      const i1 = child.circuit.kMatrix[0][1];

      this.machine.k0 = net.makeOr(this, "global_k0");

      if (i0) i0.connectTo(this.machine.k0);
      if (i1) i1.connectTo(this.machine.k0);
   }

   if (child.circuit.kMatrix[1]) {
      const i0 = child.circuit.kMatrix[1][0];
      const i1 = child.circuit.kMatrix[1][1];

      this.machine.k1 = net.makeOr(this, "global_k1");
      if (i0) i0.connectTo(this.machine.k1);
      if (i1) i1.connectTo(this.machine.k1);
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

   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    compile ...                                                      */
/*---------------------------------------------------------------------*/
function compile(machine, astNode) {
   machine.nets = [];
   machine.input_signal_map = {};
   machine.output_signal_map = {};
   machine.local_signal_list = [];

   net.resetNetId();
   
   const sigtable = new Map();
   collectSigAccesses(astNode, sigtable);
   
   // Elaboration and linking stage
   astNode.acceptAuto(new ccutils.InitVisitor(machine));
   astNode.accept(new ccutils.SignalVisitor(machine));
   astNode.accept(new ccutils.TrapVisitor());

   ast.computeNodeRegisterId(astNode, "0");
   ast.computeNodeDepth(astNode, 1, false, false);

   astNode.makeCircuit([], sigtable);

   machine.nets.forEach(net => net.reset(true));

   machine.boot_reg.value = true;

   if (machine.dumpNets) {
      machine.dumpNets(machine, false, ".nets-.json");
   }

   // optimize the circuit when asked to
   if (machine.sweep) {
      sweep.sweep(machine);
      if (machine.dumpNets) {
	 machine.dumpNets(machine, true, ".nets+.json");
      }
   }
   const { loc, size, signals, json, posFlag } =
      causality.findCausalityError(machine, true);
   if (size > 0 && machine.verbose >= 3) {
      console.error(`Warning: Potential causality cycle`, json);
   }
}
