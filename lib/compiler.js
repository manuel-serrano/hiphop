/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/compiler.new.js           */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal, Manuel Serrano                       */
/*    Creation    :  Mon Jul 16 18:06:28 2018                          */
/*    Last change :  Fri Feb  7 08:07:03 2025 (serrano)                */
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
/*    Circuit ...                                                      */
/*    -------------------------------------------------------------    */
/*    Circuit definition of a circuit. It also contains methods        */
/*    to get embeded RES, SUSP and KILL wires.                         */
/*---------------------------------------------------------------------*/
// @sealed
class Circuit {
   astNode;
   type;
   go_list;
   kill_list;
   k_matrix;
   res;
   susp;
   sel;
   
   constructor(ast_node, type, go_list, res, susp, kill_list, sel, k_matrix) {
      this.astNode = ast_node;
      this.type = type;

      if (!(go_list instanceof Array))
      	 throw error.TypeError("`go_list` must be an array.", ast_node.loc);
      this.go_list = go_list;

      if (kill_list && !(kill_list instanceof Array))
      	 throw error.TypeError("`kill_list` must be an array.", ast_node.loc) ;
      this.kill_list = kill_list;

      if (!(k_matrix instanceof Array))
      	 throw error.TypeError("`k_matrix must be a matrix.", ast_node.loc);

      for (let k = 0; k < k_matrix.length; k++) {
      	 if (!(k_matrix[k] instanceof Array)) {
	    if (k_matrix[k]) {
	       throw error.TypeError("Each completion code of `k_matrix` " +
		  "must be an array \"" +
		  k_matrix[k].toString() +
		  "\".", ast_node.loc);
	    }
      	 }
      }

      this.k_matrix = k_matrix;
      this.res = res;
      this.susp = susp;
      this.sel = sel;
   }
}

/*---------------------------------------------------------------------*/
/*    getSignalObject ...                                              */
/*    -------------------------------------------------------------    */
/*    Lookup the signal declaration.                                   */
/*    Env is a list of SignalProperties (see ast.js).                  */
/*---------------------------------------------------------------------*/
function getSignalObject(env, signame, ast_node) {

   function unbound_error() {
      throw error.TypeError(`${ast_node.tag}: unbound signal ${signame}`,
			    ast_node.loc);
   }

   for (let i = env.length - 1; i >= 0; i--) {
      const sigprop = env[i];

      if (signame === sigprop.name) {
	 if (sigprop.signal) {
	    return sigprop.signal;
	 } else {
      	    throw error.TypeError(`${ast_node.tag}: wrong signal ${signame}`,
				  ast_node.loc);
	 }
      }
   }

   if (!ast_node.autoComplete) {
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
function bindSigAccessorList(env, siglist, ast_node) {
   siglist.forEach(sigprop => {
      sigprop.signal = getSignalObject(env, sigprop.signame, ast_node);
   });
}

/*---------------------------------------------------------------------*/
/*    linkSigDeclList ...                                              */
/*---------------------------------------------------------------------*/
function linkSigDeclList(env, siglist, ast_node) {
   siglist.forEach(sigdecl => {
      if (sigdecl.alias) {
	 sigdecl.signal = getSignalObject(env, sigdecl.alias, ast_node);
      }
   });
}

/*---------------------------------------------------------------------*/
/*    linkNode ...                                                     */
/*---------------------------------------------------------------------*/
function linkNode(ast_node) {
   //
   // This function must be called *only* in ast.*.makeCircuit() and
   // *never* in make*. Otherwise, it could result that the oneshot
   // register is push not on the top of dynamically added branch but
   // inside an embded instruction
   //
   if (ast_node.dynamic) {
      const reg = new net.RegisterNet(ast_node, ast_node.constructor,
				      "oneshot_register", 0);
      const const0 = net.makeOr(ast_node, ast_node.constructor,
				"oneshot_register_reset");

      const0.connectTo(reg, net.FAN.STD);
      reg.connectTo(const0, net.FAN.DEP);
      reg.connectTo(ast_node.circuit.go_list[ast_node.depth], net.FAN.STD);
      reg.dynamic = true;
      ast_node.dynamic = false;
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
function makeExpressionNet(env, ast_node, node, level) {
   let res = null;

   if (ast_node.func || ast_node.accessor_list.length > 0) {
      bindSigAccessorList(env, ast_node.accessor_list, ast_node);
      res = new net.TestExpressionNet(ast_node, node, "testexpr", level,
				      ast_node.func, ast_node.accessor_list);

   }

   return res;
}

/*---------------------------------------------------------------------*/
/*    makeCounterNet ...                                               */
/*---------------------------------------------------------------------*/
function makeCounterNet(env, ast_node, type) {
   let counter = 0;
   const decr_counter_func = function() {
      if (counter > 0) counter--;
      return counter == 0;
   }
   const res = new net.TestExpressionNet( ast_node, type, "decr_counter",
					  0, decr_counter_func, []);
   

   const func_count = ast_node.func_count;
   let counter_val;
   const init_counter_func = function() {
      const init_val = parseInt(func_count.call(this));
      if (init_val < 1) {
	 error.RuntimeError( "Assert counter expression > 0 failed.",
			     ast_node.loc);
      }
      counter = init_val;
      return init_val;
   }

   bindSigAccessorList(env, ast_node.accessor_list_count, ast_node);
   const init_net = new net.ActionNet(ast_node, type, "init_counter", 0,
				      init_counter_func,
				      ast_node.accessor_list_count);

   try {
      const init_val = init_counter_func();
      if (init_val > 0) {
         init_net.init_val = parseInt(func_count.call(this)); 
      }
   } catch(error){
      ;
   }

   const init_or = net.makeOr(ast_node, type, "init_or");

   init_or.connectTo(init_net, net.FAN.STD);

   return { cnt: res, reset: init_or };
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Fork ...                                           */
/*    -------------------------------------------------------------    */
/*    Fig 11.10, page 122                                              */
/*---------------------------------------------------------------------*/
ast.Fork.prototype.makeCircuit = function(env, sigtable) {

   function makeParallelCircuit(env, ast_node, childCircuits) {
      const go_list = [];
      let res = null;
      let susp = null;
      let kill_list = null;
      let sel = null;
      const k_matrix = [];

      // Broadcast GO
      for (let l = 0; l <= ast_node.depth; l++) {
	 childCircuits.forEach(c => {
	    const child_go = c.go_list[l];

	    if (child_go) {
	       if (!go_list[l]) {
		  go_list[l] = net.makeOr(ast_node, ast.Fork, "go", l);
	       }
	       go_list[l].connectTo(child_go, net.FAN.STD);
	    }
	 });
      }

      // Broadcast RES, SUSP, KILL
      res = ccutils.getResChildren(ast_node, ast.Fork, childCircuits);
      susp = ccutils.getSuspChildren(ast_node, ast.Fork, childCircuits);
      kill_list = ccutils.killListChildren(ast_node, ast.Fork, childCircuits);

      // Union on SEL
      childCircuits.forEach(c => {
	 const child_sel = c.sel;

	 if (child_sel) {
	    if (!sel) {
	       sel = net.makeOr(ast_node, ast.Fork, "sel");
	    }
	    child_sel.connectTo(sel, net.FAN.STD);
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
	 if (c.k_matrix.length > max) {
	    max = c.k_matrix.length;
	 }
      });

      // Union K of children
      childCircuits.forEach(iChild => {
	 for (let k = 0; k < max; k++) {
	    if (!union[k]) {
	       union[k] = [];
	       for (let i = 0; i <= ast_node.depth; i++) {
		  union[k][i] =
		     net.makeOr(ast_node, ast.Fork, "union_k" + k, i);
	       }
	    }
	    const kList = ccutils.getKListChild(ast_node, ast.Fork, iChild, k);
	    for (let i = 0; i <= ast_node.depth; i++) {
	       if (kList[i]) {
		  kList[i].connectTo(union[k][i], net.FAN.STD);
	       }
	    }
	 }
      });

      // Connect EXIT to KILL
      if (kill_list) {
	 for (let k = 2; k < union.length; k++) {
	    for (let i = union[k].length - 1; i >= 0; i--) {
	       if (!kill_list[i]) {
		  kill_list[i] = net.makeOr(ast_node, ast.Fork, "pkill", i);
	       }
	       union[k][i].connectTo(kill_list[i], net.FAN.STD);
	    }
	 }
      }

      // Min of children
      for (let c = childCircuits.length - 1; c >= 0; c--) {
	 const child_interface = childCircuits[c];
	 const child_k_matrix = child_interface.k_matrix;
	 const child_min_matrix = [];

	 min[c] = child_min_matrix;
	 child_min_matrix[0] = [];


	 // connect all incarnation of K0 of child
	 for (let l = 0; l <= ast_node.depth; l++) {
	    child_min_matrix[0][l] =
	       net.makeOr(ast_node, ast.Fork, "or_min_k0" + "_child" + c, l);
	    if (child_k_matrix[0] && child_k_matrix[0][l]) {
	       child_k_matrix[0][l]
		  .connectTo(child_min_matrix[0][l], net.FAN.STD);
	    }
	 }

	 // connect OR-NOT door with GO of parallel and SEL of child
	 const sel_not = net.makeOr(ast_node, ast.Fork, "sel_not_child" + c);

	 go_list[ast_node.depth].connectTo(sel_not, net.FAN.STD);
	 if (child_interface.sel) {
	    child_interface.sel.connectTo(sel_not, net.FAN.STD);
	 }
	 sel_not.connectTo(child_min_matrix[0][ast_node.depth], net.FAN.NEG);

	 // connect all incarnation of child min Kn-1 to child min Kn
	 for (let k = 1; k < max; k++) {
	    child_min_matrix[k] = [];

	    for (let l = 0; l <= ast_node.depth; l++) {
	       child_min_matrix[k][l] =
		  net.makeOr(ast_node, ast.Fork,
			     "or_min_k" + k + "_child" + c,
			     l);
	       child_min_matrix[k - 1][l]
		  .connectTo(child_min_matrix[k][l], net.FAN.STD);
	       if (child_k_matrix[k] && child_k_matrix[k][l]) {
		  child_k_matrix[k][l]
		     .connectTo(child_min_matrix[k][l], net.FAN.STD);
	       }
	    }
	 }
      }

      // Build K output doors and connect union to them
      for (let k = union.length - 1; k >= 0; k--) {
	 k_matrix[k] = [];
	 for (let l = union[k].length - 1; l >= 0; l--) {
	    k_matrix[k][l] =
	       net.makeAnd(ast_node, ast.Fork, "and_k" + k, l);
	    union[k][l].connectTo(k_matrix[k][l], net.FAN.STD);
	 }
      }

      // Connect min to K output doors
      for (let c = min.length - 1; c >= 0; c--) {
	 for (let k = min[c].length - 1; k >= 0; k--) {
	    for (let l = min[c][k].length - 1; l >= 0; l--) {
	       min[c][k][l].connectTo(k_matrix[k][l], net.FAN.STD);
	    }
	 }
      }

      return new Circuit(ast_node, ast.Fork, go_list, res, susp,
    			 kill_list, sel, k_matrix);
   }

   const ccs = this.children.map((c, i, arr) => c.makeCircuit(env, sigtable));
   const circuit = makeParallelCircuit(env, this, ccs);
   this.circuit = circuit;


   linkNode(this);
   return circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Trap ...                                           */
/*    -------------------------------------------------------------    */
/*    Fig 11.12, page 124                                              */
/*---------------------------------------------------------------------*/
ast.Trap.prototype.makeCircuit = function(env, sigtable) {

   function makeTrapCircuit(env, ast_node, child_interface) {
      if (child_interface.k_matrix.length <= 2)
	 return child_interface;

      const k0_list = [];
      const k_matrix_child = child_interface.k_matrix;
      const k_matrix = [k0_list];
      const k0_list_child = ccutils.getKListChild(ast_node, ast.Trap, child_interface, 0);
      const trap_gate_list = ccutils.getKListChild(ast_node, ast.Trap,
						   child_interface, 2);

      //
      // Get K0 of child, and connect it to K0 output door
      //
      for (let l in k0_list_child) {
	 k0_list[l] = net.makeOr(ast_node, ast.Trap, "or_k0", l);
	 k0_list_child[l].connectTo(k0_list[l], net.FAN.STD);
      }

      //
      // Get K2 of child, and connect it to K0 output door
      //
      for (let l in trap_gate_list) {
	 if (!k0_list[l])
	    k0_list[l] = net.makeOr(ast_node, ast.Trap, "or_k0", l);
	 trap_gate_list[l].connectTo(k0_list[l], net.FAN.STD);
      }

      //
      // Propagate K1 of child and Shift K > 2
      //
      k_matrix[1] = ccutils.getKListChild(ast_node, ast.Trap, child_interface, 1);
      for (let k = 3; k < k_matrix_child.length; k++)
	 k_matrix[k - 1] = ccutils.getKListChild(ast_node, ast.Trap,
						 child_interface, k);

      return new Circuit(ast_node, ast.Trap,
			 child_interface.go_list,
			 child_interface.res,
			 child_interface.susp,
			 ccutils.killListChildren(ast_node, ast.Trap, [child_interface]),
			 child_interface.sel,
			 k_matrix);
   }

   const cc0 = this.children[0].makeCircuit(env, sigtable);
   this.circuit = makeTrapCircuit(env, this, cc0);

   linkNode(this);
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Exit ...                                           */
/*    -------------------------------------------------------------    */
/*    Fig 11.13, page 125                                              */
/*---------------------------------------------------------------------*/
ast.Exit.prototype.makeCircuit = function(env, sigtable) {

   function makeExitCircuit(env, ast_node) {
      const go_list = [];
      const k_matrix = [];

      k_matrix[ast_node.returnCode] = [];

      for (let i = 0; i <= ast_node.depth; i++) {
	 const go = net.makeOr(ast_node, ast.Exit, "go", i);

	 go_list[i] = go;
	 k_matrix[ast_node.returnCode][i] = go;
      }

      return new Circuit(ast_node, ast.Exit, go_list,
			 null, null, null, null,
			 k_matrix);
   }

   this.circuit = makeExitCircuit(env, this);

   linkNode(this);
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeSequenceCircuit ...                                          */
/*    -------------------------------------------------------------    */
/*    Fig. 11.8, page 120.                                             */
/*---------------------------------------------------------------------*/
function makeSequenceCircuit(env, ast_node, childCircuits) {
   const len = childCircuits.length;
   let sel = null;
   const k_matrix = [[]];

   for (let i = 0; i < len; i++) {
      const childCircuit = childCircuits[i];

      // connect each KO incarnation of child[N] to each GO
      // incarnation of child[N + 1]
      if (i + 1 < len) {
	 const next_depth = childCircuits[i + 1].astNode.depth;
	 const next_go_list = childCircuits[i + 1].go_list;

	 for (let l = 0; l <= childCircuit.astNode.depth; l++) {
	    if (!childCircuit.k_matrix[0]
	       || !childCircuit.k_matrix[0][l])
	       continue;
	    let next_l = l;

	    if (l > next_depth) {
	       next_l = next_depth;
	    }
	    childCircuit.k_matrix[0][l]
	       .connectTo(next_go_list[next_l], net.FAN.STD);
	 }
      }

      // connect SEL if needed
      if (childCircuit.sel) {
	 if (!sel) {
	    sel = net.makeOr(ast_node, ast.Sequence, "sel");
	 }
	 childCircuit.sel.connectTo(sel, net.FAN.STD);
      }

      // connects Kn where n > 0
      for (let j = 1; j < childCircuit.k_matrix.length; j++) {
	 const kList =
	    ccutils.getKListChild(ast_node, ast.Sequence, childCircuit, j);

	 if (!k_matrix[j]) {
	    k_matrix[j] = [];
	 }

	 for (let l = 0; l < kList.length; l++) {
	    if (!k_matrix[j][l]) {
	       k_matrix[j][l] = net.makeOr(ast_node, ast.Sequence, "buf_k" + j + "_buffer_output", l);
	    }
	    kList[l].connectTo(k_matrix[j][l], net.FAN.STD);
	 }
      }
   }

   // get K0 of last child
   k_matrix[0] =
      ccutils.getKListChild(ast_node, ast.Sequence, childCircuits[len - 1], 0);

   //
   // get RES of children
   //
   const res = ccutils.getResChildren(ast_node, ast.Sequence, childCircuits);

   //
   // get SUSP of children
   //
   const susp = ccutils.getSuspChildren(ast_node, ast.Sequence, childCircuits);

   //
   // get KILL list of children
   //
   const kill_list = ccutils.killListChildren(ast_node, ast.Sequence, childCircuits);

   return new Circuit(ast_node, ast.Sequence, childCircuits[0].go_list,
		      res, susp, kill_list, sel, k_matrix);
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Sequence ...                                       */
/*---------------------------------------------------------------------*/
ast.Sequence.prototype.makeCircuit = function(env, sigtable) {
   const ccs = this.children.map((c, i, arr) => c.makeCircuit(env, sigtable));
   this.circuit = makeSequenceCircuit(env, this, ccs);

   linkNode(this);
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
function makePauseCircuit(env, ast_node) {
   const go_list = [];
   const kill_list = [];
   const k_matrix = [[], []];
   const reg = new net.RegisterNet(ast_node, ast.Pause, "reg", 0);
   const and_to_or = net.makeAnd(ast_node, ast.Pause, "and_to_or");
   const or_to_reg = net.makeOr(ast_node, ast.Pause, "or_to_reg");
   const and_to_k0 = net.makeAnd(ast_node, ast.Pause, "and_to_k0");

   and_to_or.connectTo(or_to_reg, net.FAN.STD);
   or_to_reg.connectTo(reg, net.FAN.STD);
   reg.connectTo(and_to_k0, net.FAN.STD);
   reg.connectTo(and_to_or, net.FAN.STD);
   k_matrix[0][ast_node.depth] = and_to_k0;

   for (let i = 0; i <= ast_node.depth; i++) {
      const go = net.makeOr(ast_node, ast.Pause, "go", i);
      go_list[i] = go;
      k_matrix[1][i] = go;

      const kill = net.makeOr(ast_node, ast.Pause, "kill", i);
      kill_list[i] = kill;

      const and = net.makeAnd(ast_node, ast.Pause, "and", i);
      go.connectTo(and, net.FAN.STD);
      kill.connectTo(and, net.FAN.NEG);
      and.connectTo(or_to_reg, net.FAN.STD);
   }

   kill_list[ast_node.depth].connectTo(and_to_or, net.FAN.NEG);

   return new Circuit(ast_node, ast.Pause,
		      // --
		      go_list,    // GO
		      and_to_k0,  // RES
		      and_to_or,  // SUSP
		      kill_list,  // KILL
		      // --
		      reg,        // SEL
		      k_matrix);  // K
}

/*---------------------------------------------------------------------*/
/*    makeAwaitCircuit ...                                             */
/*---------------------------------------------------------------------*/
function makeAwaitCircuit(env, ast_node) {
   const chalt = makeHaltCircuit(env, ast_node);
   return makeAbortCircuit(env, ast_node, chalt, false);
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
function makeLoopeachCircuit(env, ast_node, childCircuit) {
   const halt = makeHaltCircuit(env, ast_node);
   const seq = makeSequenceCircuit(env, ast_node, [childCircuit, halt])
   const abort = makeAbortCircuit(env, ast_node, seq, true);

   return makeLoopCircuit(env, ast_node, abort);
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
/*    Fig 11.9, page 121                                               */
/*---------------------------------------------------------------------*/
function makeLoopCircuit(env, ast_node, childCircuit) {
   const depth1 = ast_node.depth;
   const depth2 = childCircuit.astNode.depth;
   const go_list = [];
   const k_matrix = [[]];

   for (let l = 0; l <= depth1; l++) {
      let or = net.makeOr(ast_node, ast.Loop, "go", l);

      or.connectTo(childCircuit.go_list[l], net.FAN.STD);
      go_list[l] = or;
   }

   //
   // Error on instantaneous loop, and connect K0[depth2] on K0[depth1]
   //
   for (let l = 0; l <= depth2; l++) {
      if (childCircuit.k_matrix[0][l] && (depth2 == 0 || l < depth2))
	 childCircuit.k_matrix[0][l].connectTo(
	    new net.ActionNet(ast_node, ast.Loop, "error", l,
			      function() {
				 throw error.TypeError(
				    "Instantaneous loop.", ast_node.loc) },
			      []),
	    net.FAN.STD);
   }

   if (childCircuit.k_matrix[0][depth2]) {
      childCircuit.k_matrix[0][depth2]
	 .connectTo(go_list[depth1], net.FAN.STD);
   }

   for (let k = 1; k < childCircuit.k_matrix.length; k++) {
      k_matrix[k] = ccutils.getKListChild(ast_node, ast.Loop, childCircuit, k);
   }

   const kill_list = ccutils.killListChildren(ast_node, ast.Loop, [childCircuit]);

   return new Circuit(ast_node, ast.Loop, go_list, childCircuit.res,
		      childCircuit.susp, kill_list, childCircuit.sel,
		      k_matrix);
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Nothing ...                                        */
/*---------------------------------------------------------------------*/
ast.Nothing.prototype.makeCircuit = function(env, sigtable) {
   this.circuit = makeNothingCircuit(env, this);

   linkNode(this);
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeNothingCircuit ...                                           */
/*---------------------------------------------------------------------*/
function makeNothingCircuit(env, ast_node) {
   const go_list = [];
   const k_matrix = [[]];

   for (let i = 0; i <= ast_node.depth; i++) {
      const go = net.makeOr(ast_node, ast.Nothing, "go", i);

      go_list[i] = go;
      k_matrix[0][i] = go;
   }

   return new Circuit(ast_node, ast.Nothing, go_list,
		      null, null, null, null,
		      k_matrix);
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Atom ...                                           */
/*---------------------------------------------------------------------*/
ast.Atom.prototype.makeCircuit = function(env, sigtable) {
   const go_list = [];
   const k_matrix = [[]];
   const atomFunc = this.func;
   const frame = this.frame;
   const func = frame ? function() { atomFunc(frame) } : atomFunc;

   for (let i = 0; i <= this.depth; i++) {
      bindSigAccessorList(env, this.accessor_list, this);

      // GB 1/6/19 : fixed big bug by Colin, the action gate was not
      // connected to anything and could be executed at any timed!
      // k_matrix[0] must contain the action nets, not the go nets!
      const goNet = net.makeOr(this, ast.Atom, "go", i);
      const actionNet = new net.ActionNet(this, ast.Atom, "action", i,
					  func, this.accessor_list);
      goNet.connectTo(actionNet, net.FAN.STD);
      go_list[i] = goNet;
      k_matrix[0][i] = actionNet
   }

   this.circuit = new Circuit(this, ast.Atom, go_list, null, null, null,
			      null, k_matrix);
   linkNode(this);
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Suspend ...                                        */
/*---------------------------------------------------------------------*/
ast.Suspend.prototype.makeCircuit = function(env, sigtable) {
   const cc0 = this.children[0].makeCircuit(env, sigtable);
   this.circuit = makeSuspendCircuit(env, this, cc0);

   linkNode(this);
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeSuspendCircuit ...                                           */
/*    -------------------------------------------------------------    */
/*    Fig 11.6, page 119                                               */
/*---------------------------------------------------------------------*/
function makeSuspendCircuit(env, ast_node, childCircuit) {
   const and1 = net.makeAnd(ast_node, ast.Suspend, "and1_sel_res");
   const and2 = net.makeAnd(ast_node, ast.Suspend, "and2_negtest_and1");
   const and3 = net.makeAnd(ast_node, ast.Suspend, "and3_test_and1");
   const or1 = net.makeOr(ast_node, ast.Suspend, "or1_susp_and3");
   const or2 = net.makeOr(ast_node, ast.Suspend, "or2_k1_and3");
   const k_matrix = [];

   and1.connectTo(and2, net.FAN.STD);
   and1.connectTo(and3, net.FAN.STD);
   and3.connectTo(or1, net.FAN.STD);
   and3.connectTo(or2, net.FAN.STD);

   if (childCircuit.sel) {
      childCircuit.sel.connectTo(and1, net.FAN.STD);
   }

   if (childCircuit.res) {
      and2.connectTo(childCircuit.res, net.FAN.STD);
   }

   if (childCircuit.susp) {
      or1.connectTo(childCircuit.susp, net.FAN.STD);
   }

   const e = makeExpressionNet(env, ast_node, ast.Suspend, ast_node.depth);
   and1.connectTo(e, net.FAN.STD);
   e.connectTo(and3, net.FAN.STD);
   e.connectTo(and2, net.FAN.NEG);

   for (let k = 0; k < childCircuit.k_matrix.length; k++) {
      k_matrix[k] =
	 ccutils.getKListChild(ast_node, ast.Suspend, childCircuit, k);
   }

   if (k_matrix.length > 1) {
      if (k_matrix[1][ast_node.depth]) {
      	 or2.connectTo(k_matrix[1][ast_node.depth], net.FAN.STD);
      }
   }

   const kills =
      ccutils.killListChildren(ast_node, ast.Suspend, [childCircuit]);

   return new Circuit(ast_node, ast.Suspend,
		      // --
		      childCircuit.go_list,  // GO
		      and1,                  // RES
		      or1,                   // SUSP
		      kills,                 // KILL
		      // --
		      childCircuit.sel,      // SEL
		      k_matrix);             // K
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
   const cc = this.children[0].makeCircuit(env, sigtable);
   this.circuit = makeAbortCircuit(env, this, cc, false);

   linkNode(this);
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeAbortCircuit ...                                             */
/*    -------------------------------------------------------------    */
/*    Fig 11.7, page 120 and Rules page 150                            */
/*---------------------------------------------------------------------*/
function makeAbortCircuit(env, ast_node, childCircuit, force_non_immediate) {

   function makeAbortInner(env, ast_node, childCircuit) {
      const res = net.makeAnd(ast_node, ast.Abort, "abort_res");
      
      const and2 = net.makeAnd(ast_node, ast.Abort, "and2_negtest_res");
      const and3 = net.makeAnd(ast_node, ast.Abort, "and3_test_res");
      const or = net.makeOr(ast_node, ast.Abort, "or_and3_k0");
      const go_list = [];
      const k_matrix = [[]];

      for (let l = 0; l <= ast_node.depth; l++) {
	 const go = net.makeOr(ast_node, ast.Abort, "go", l);

	 go.connectTo(childCircuit.go_list[l], net.FAN.STD);
	 go_list[l] = go;
      }

      //
      // Special case for Exec - GB caisse ?
      //
      if (ast_node instanceof ast.Exec) {
	 ast_node.exec_status.callback_wire.connectTo(and3, net.FAN.STD);
	 ast_node.exec_status.callback_wire.connectTo(and2, net.FAN.NEG);
      } else if (ast_node.func_count) {
	 //
	 // If a counter must be created, AND and AND-not gates must be
	 // connected only on the counter output (and not on expr test)
	 //
	 const decr_list = [];

	 decr_list[0] = makeExpressionNet(env, ast_node, ast.Abort, ast_node.depth);
	 res.connectTo(decr_list[0], net.FAN.STD);
	 decr_list[1] = res;
	 const { cnt, reset } = makeCounterNet(env, ast_node, ast.Abort);
	 go_list.forEach(n => n.connectTo(reset, net.FAN.STD));
	 decr_list.forEach(n => n.connectTo(cnt, net.FAN.STD));
	 cnt.connectTo(and3, net.FAN.STD);
	 cnt.connectTo(and2, net.FAN.NEG);
      } else {
	 // 
	 // normal test expression controlling the abort statement
	 //
	 const e = makeExpressionNet(env, ast_node, ast.Abort, ast_node.depth);
	 res.connectTo(e, net.FAN.STD);
	 e.connectTo(and3, net.FAN.STD);
	 e.connectTo(and2, net.FAN.NEG);
      }

      res.connectTo(and2, net.FAN.STD);
      res.connectTo(and3, net.FAN.STD);
      and3.connectTo(or, net.FAN.STD);

      //
      // connect SEL of subcircuit
      //
      if (childCircuit.sel) {
	 childCircuit.sel.connectTo(res, net.FAN.STD);
      }

      //
      // connect to RES of subcircuit
      //
      if (childCircuit.res) {
	 and2.connectTo(childCircuit.res, net.FAN.STD);
      }

      //
      // connect K0 on depth
      //
      const k0 = childCircuit.k_matrix[0][childCircuit.astNode.depth];
      if (k0) {
	 k0.connectTo(or, net.FAN.STD);
      }
      // MS 30jan2025, I don't understand how (or why) this implement
      // the rule of page 150!
      k_matrix[0][ast_node.depth] = or;

      //
      // connect K0 on surface and Kn
      //
      
      for (let l = 0; l < ast_node.depth; l++) {
	 k_matrix[0][l] = childCircuit.k_matrix[0][l];
      }

      for (let k = 1; k < childCircuit.k_matrix.length; k++) {
	 k_matrix[k] =
	    ccutils.getKListChild(ast_node, ast.Abort, childCircuit, k);
      }

      const kills =
	 ccutils.killListChildren(ast_node, ast.Abort, [childCircuit]);
      
      return new Circuit(ast_node, ast.Abort,
			 // --
			 go_list,           // GO
			 res,               // RES
			 childCircuit.susp, // SUSP
			 kills,             // KILL
			 // --
			 childCircuit.sel,  // SEL
			 k_matrix);         // K
   }

   if (!force_non_immediate && ast_node.immediate) {
      return makeIfCircuit(env,
			   ast_node,
			   [makeNothingCircuit(env, ast_node),
			    makeAbortInner(env, ast_node, childCircuit)]);
   } else {
      return makeAbortInner(env, ast_node, childCircuit);
   }
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Emit ...                                           */
/*---------------------------------------------------------------------*/
ast.Emit.prototype.makeCircuit = function(env, sigtable) {
   this.circuit = makeEmitCircuit(env, this);

   linkNode(this);
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeEmit ...                                                     */
/*    -------------------------------------------------------------    */
/*    Fig 11.4, page 116                                               */
/*---------------------------------------------------------------------*/
function makeEmitCircuit(env, ast_node) {

   function makeEmitInnerCircuit(env, ast_node, signame) {
      const go_list = [];
      const k_matrix = [[]];

      for (let i = 0; i <= ast_node.depth; i++) {
	 const go = net.makeOr(ast_node, ast.Emit, signame + "_go", i);
	 const sig = getSignalObject(env, signame, ast_node);
	 const sig_gate = signalGate(sig, i);

	 go.connectTo(sig_gate, net.FAN.STD);
	 go_list[i] = go;

	 // Special case for exec
	 if (ast_node instanceof ast.Exec) {
	    k_matrix[0][i] = go;
	    ast_node.signal = sig;
	    const exec_emission_func = function() {
	       // MS 20jan2025: fix, exec signals are sent during the
	       // machine.update operation (see machine.js)
	       // This fixes causal-artist-player.hh.js, depnowval.hh.js,
	       // and depnowval-local.hh.js bugs
	       // sig.set_value(ast_node.exec_status.value, i, ast_node.loc);
	       ast_node.exec_status.value = undefined;
	    }

	    const anet = new net.ActionNet(
	       ast_node, ast.Emit, "_exec_return_sig",
	       i, exec_emission_func, []);

	    go.connectTo(anet, net.FAN.STD);
	    k_matrix[0][i] = anet;
	 } else {
	    // Warning: the key must be signame and *not* sig.name, in
	    // case of bouded signals.
	    ast_node.signal_map[signame] = sig;

	    if (ast_node.func || ast_node.accessor_list.length > 0) {
	       bindSigAccessorList(env, ast_node.accessor_list, ast_node);
	       const expr = new net.SignalExpressionNet(
		  ast_node, ast.Emit, sig, signame + "_signal_expr", i,
		  ast_node.func, ast_node.accessor_list);
	       go.connectTo(expr, net.FAN.STD);
	       k_matrix[0][i] = expr;
	    } else {
	       k_matrix[0][i] = go;
	    }
	 }
      }

      return new Circuit(ast_node, ast.Emit, go_list, null, null, null,
			 null, k_matrix);
   }

   function makeEmitIfCircuit(env, ast_node) {
      let emit_node;

      if (ast_node.signame_list.length === 1) {
	 emit_node = makeEmitInnerCircuit(
	    env, ast_node, ast_node.signame_list[0]);
      } else {
	 emit_node = makeSequenceCircuit(
	    env, ast_node, ast_node.signame_list.map(
	       function(el, i, arr) {
		  return makeEmitInnerCircuit(env, ast_node, el);
	       }));
      }

      //
      // That burn the eyes and it will probably broke one day, but it
      // allows to keep the intermediate representation like the source
      // code, therefore, it makes easier the debugging of HH when use
      // pretty-printer/debugger...
      //
      // Basically, we build a dummy If AST node, giving it if_func and
      // if_accessor_list of the Emit node, to be able to build an if
      // circuit, with the emit in then branch.
      //
      if (ast_node.if_func) {
	 let if_circuit;
	 let nothing_circuit;
	 const if_ast = new ast.If("IF", undefined, ast_node.loc,
				   true, [], false,
				   ast_node.if_func, ast_node.if_accessor_list);

	 if_ast.machine = ast_node.machine;
	 if_ast.depth = ast_node.depth;
	 nothing_circuit = makeNothingCircuit(if_ast, ast_node);
	 if_circuit = makeIfCircuit(env, if_ast, [emit_node, nothing_circuit]);

	 return if_circuit;
      }

      return emit_node;
   }

   if (ast_node instanceof ast.Exec) {
      return makeEmitInnerCircuit(env, ast_node, ast_node.signame);
   } else {
      return makeEmitIfCircuit(env, ast_node);
   }
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Sustain ...                                        */
/*---------------------------------------------------------------------*/
ast.Sustain.prototype.makeCircuit = function(env, sigtable) {
   const cpause = makePauseCircuit(env, this);
   const cemit = makeEmitCircuit(env , this);
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
function makeIfCircuit(env, ast_node, childCircuits) {
   const go_list = [];
   let sel = null;

   for (let i = 0; i <= ast_node.depth; i++) {
      const go = net.makeOr(ast_node, ast.If, "go", i);
      const and_then = net.makeAnd(ast_node, ast.If, "and_then", i);
      const and_else = net.makeAnd(ast_node, ast.If, "and_else", i);

      if (ast_node.not) {
 	 const e = makeExpressionNet(env, ast_node, ast.If, i);
	 go.connectTo(e, net.FAN.STD);
	 e.connectTo(and_else, net.FAN.STD);
	 e.connectTo(and_then, net.FAN.NEG);
      } else {
	 const e = makeExpressionNet(env, ast_node, ast.If, i);
	 go.connectTo(e, net.FAN.STD);
	 e.connectTo(and_then, net.FAN.STD);
	 e.connectTo(and_else, net.FAN.NEG);
      }

      go.connectTo(and_then, net.FAN.STD);
      go.connectTo(and_else, net.FAN.STD);

      and_then.connectTo(childCircuits[0].go_list[i], net.FAN.STD);
      and_else.connectTo(childCircuits[1].go_list[i], net.FAN.STD);

      go_list[i] = go;
   }

   for (let i = childCircuits.length - 1; i >= 0; i--) {
      if (childCircuits[i].sel) {
	 if (!sel) {
	    sel = net.makeOr(ast_node, ast.If, "sel");
	 }
	 childCircuits[i].sel.connectTo(sel, net.FAN.STD);
      }
   }

   //
   // get RES of children
   //
   const res = ccutils.getResChildren(ast_node, ast.If, childCircuits);

   //
   // get SUSP of children
   //
   const susp = ccutils.getSuspChildren(ast_node, ast.If, childCircuits);

   //
   // get KILL list of children
   //
   const kill_list = ccutils.killListChildren(ast_node, ast.If, childCircuits);

   //
   // get Kn list of children, make union of then
   //
   const k_matrix = [];
   const k_matrix_then = childCircuits[0].k_matrix;
   const k_matrix_else = childCircuits[1].k_matrix;
   const max_k = Math.max(k_matrix_then.length, k_matrix_else.length) - 1;
   for (let ki = 0; ki <= max_k; ki++) {
      const k_list_then = ccutils.getKListChild(ast_node, ast.If,
						childCircuits[0], ki);
      const k_list_else = ccutils.getKListChild(ast_node, ast.If,
						childCircuits[1], ki);
      k_matrix[ki] = [];
      for (let kl = 0; kl <= ast_node.depth; kl++) {
	 const union = net.makeOr(ast_node, ast.If, "k", + ki + "_union_buffer",
				  ki);
	 k_matrix[ki][kl] = union;
	 if (k_list_then[kl]) {
	    k_list_then[kl].connectTo(union, net.FAN.STD);
	 }
	 if (k_list_else[kl]) {
	    k_list_else[kl].connectTo(union, net.FAN.STD);
	 }
      }
   }

   return new Circuit(ast_node, ast.If, go_list, res, susp, kill_list, sel,
		      k_matrix);
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
function makeHaltCircuit(env, ast_node) {
   return makeLoopCircuit(env, ast_node, makePauseCircuit(env, ast_node));
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
      callback_wire: net.makeOr(this, ast.Exec, "callback_wire"),

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
	 this, ast.Exec, "start", l, function() {
   	    exec_status.start = true;
	    exec_status.lvl = l;
	 }, []);
      await_node.go_list[l].connectTo(start, net.FAN.STD);

      const kill = new net.ActionNet(
	 this, ast.Exec, "kill", l, function() {
	    exec_status.kill = true;
	 }, []);
      await_node.kill_list[l].connectTo(start, net.FAN.NEG);
      await_node.kill_list[l].connectTo(kill, net.FAN.STD);

      //
      // kill handler must be called in case of abortion
      //
      const andDetectAbort = new net.ActionNet(
	 this, ast.Exec, "abort", l, function() {
	    exec_status.kill = true;
	 }, []);
      await_node.res.connectTo(andDetectAbort, net.FAN.NEG);
      await_node.susp.connectTo(andDetectAbort, net.FAN.NEG);
      await_node.sel.connectTo(andDetectAbort, net.FAN.STD);

      const susp = new net.ActionNet(
	 this, ast.Exec, "susp", l, function() {
   	    exec_status.suspended = true;
	 }, []);
      await_node.susp.connectTo(susp, net.FAN.STD);
      await_node.sel.connectTo(susp, net.FAN.STD);

      const res = new net.ActionNet(
	 this, ast.Exec, "res", l, function() {
   	    exec_status.suspended = false;
	 }, []);
      await_node.res.connectTo(res, net.FAN.STD);
      await_node.sel.connectTo(res, net.FAN.STD);

      bindSigAccessorList(env, this.accessor_list, this);
      signal.runtimeSignalAccessor(this, this.accessor_list, l);
   }

   if (this.signame) {
      const cemit = makeEmitCircuit(env, this);
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
   const go_list = [];
   const child = this.children[0];
   const res = net.makeOr(this, ast.Local, "res_buf");

   //
   // As child circuit can use signal declared in this local, we need to
   // build them first. As we don't know yet if the child circuit uses
   // k1, kill or susp, we have to use buffers...
   //
   const k_matrix = [[], []];
   const kill_list = [];
   const susp = net.makeOr(this, ast.Local, "susp_buf");
   const initList = [];

   for (let i = 0; i <= this.depth; i++) {
      k_matrix[1][i] = net.makeOr(this, ast.Local, "k1_output_buffer", i);
      kill_list[i] = net.makeOr(this, ast.Local, "kill_output_buffer", i);
      go_list[i] = net.makeOr(this, ast.Local, "go", i);
   }

   // Generation of signal in the Local scope.  For now, Only
   // unbound signals are created, and `accessibility` is ignored.
   this.sigDeclList.forEach(sigprop => {
      if (!sigprop.alias) {
	 const s = new signal.Signal(this, sigprop, ast.Local, 
				     new net.RegisterNet(this, ast.Local, sigprop.name + "_pre_reg", 0),
				     k_matrix[1], kill_list, susp);

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
	       this, ast.Local, "init", l, function() {
		  signal.create_scope.call(
		     this, s, l);
	       }, s.init_accessor_list);
	    go_list[l].connectTo(action_init, net.FAN.STD);
	    initList.push(action_init);

	    bindSigAccessorList(env, s.reinit_accessor_list, this);
	    const action_reinit = new net.ActionNet(
	       this, ast.Local, "reinit", l, function() {
		  signal.resume_scope.call(
		     this, s, l);
	       }, s.reinit_accessor_list);
	    res.connectTo(action_reinit, net.FAN.STD);
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
   // Connect kill_list buffers to nested kill_list buffers
   //
   const nestedKillList = ccutils.killListChildren(this, ast.Local, [child.circuit]);
   if (nestedKillList) {
      for (let k in kill_list) {
	 kill_list[k].connectTo(nestedKillList[k], net.FAN.STD);
      }
   }

   //
   // connect child circuit to buffers res, k1, kill and susp
   //
   if (child.circuit.res) {
      res.connectTo(child.circuit.res, net.FAN.STD);
   }

   if (child.circuit.susp) {
      susp.connectTo(child.circuit.susp, net.FAN.STD);
   }

   k_matrix[0] = ccutils.getKListChild(this, ast.Local, child.circuit, 0);
   for (let i = 2; i < child.circuit.k_matrix.length; i++) {
      k_matrix[i] = ccutils.getKListChild(this, ast.Local, child.circuit, i)
   }

   for (let i in child.circuit.k_matrix[1]) {
      const lvl = i > this.depth ? this.depth : i;
      child.circuit.k_matrix[1][i].connectTo(
	 k_matrix[1][lvl], net.FAN.STD);
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
      const go = initList[l] ? initList[l] : go_list[l];
      go.connectTo(child.circuit.go_list[l], net.FAN.STD);
   }

   this.circuit = new Circuit(this, ast.Local, go_list, res, susp,
			      kill_list, child.circuit.sel, k_matrix);
   linkNode(this);

   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Module ...                                         */
/*---------------------------------------------------------------------*/
ast.Module.prototype.makeCircuit = function(env, sigtable) {
   const boot_reg = new net.RegisterNet(this, ast.Module, "global_boot_register", 0);
   const const0 = net.makeOr(this, ast.Module, "global_const0");
   const0.sweepable = false;
   
   //
   // It's mandatory that `boot_reg` propagates BEFORE `const0` the
   // first reaction. It's OK with current known list, but keep that
   // in mind. (we also could make a dependency of `boot_reg` to
   // `const0`?)
   //
   const0.connectTo(boot_reg, net.FAN.STD);
   this.machine.boot_reg = boot_reg;

   //
   // Generation of global signal
   //
   const signalsReady = net.makeOr(this, ast.Module, "global_signals_ready");
   boot_reg.connectTo(signalsReady, net.FAN.STD);

   // nenv must be constructed incrementally in order to support
   // initialization dependencies
   const nenv = env;

   for (let i in this.sigDeclList) {
      const sigdecl = this.sigDeclList[i];
      const axs = sigtable.get(sigdecl.name);
      const pre_reg = axs?.get_pre
	 ? new net.RegisterNet(this, ast.Module, sigdecl.name + "_pre_reg", 0)
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
	    this, ast.Module, "reinit", 0, function() {
	       signal.resume_scope.call(this, s);
	    }, s.reinit_accessor_list);
	 const0.connectTo(action_reinit, net.FAN.NEG);
	 action_reinit.connectTo(signalsReady, net.FAN.DEP);
      } else if (s.init_func) {
	 bindSigAccessorList(env, s.init_accessor_list, this);
	 const action_init = new net.ActionNet(
	    this, ast.Module, "init", 0, function() {
	       signal.create_scope.call(this, s, 0);
	    }, s.init_accessor_list);
	 boot_reg.connectTo(action_init, net.FAN.STD);
	 action_init.connectTo(signalsReady, net.FAN.DEP);
      }
   }

   // compile the whole module
   this.children.forEach(c => c.makeCircuit(nenv, sigtable));

   // last children is the reactive program code
   const child = this.children[this.children.length - 1];
   let list = null;

   // signals connections
   signalsReady.connectTo(child.circuit.go_list[0], net.FAN.STD);

   // allocate and connect global sel and res wires
   const global_sel = net.makeOr(this, ast.Module, "global_sel");
   const global_res = net.makeAnd(this, ast.Module, "global_res");
   
   boot_reg.connectTo(global_res, net.FAN.NEG);
   global_sel.connectTo(global_res, net.FAN.STD);
   
   // connect child circuit to the module
   if (child.circuit.res) {
      global_res.connectTo(child.circuit.res, net.FAN.STD);
   }

   if (child.circuit.sel) {
      child.circuit.sel.connectTo(global_sel, net.FAN.STD);
   }
   
   if (child.circuit.kill && child.circuit.kill[0]) {
      const0.connectTo(child.circuit.kill[0], net.FAN.STD);
   }

   if (child.circuit.susp) {
      const0.connectTo(child.circuit.susp, net.FAN.STD);
   }

   // Connect sel, K0 (level 0) and K1 (level 0)
   this.machine.sel = child.circuit.sel;
   if (child.circuit.k_matrix[0]) {
      const i0 = child.circuit.k_matrix[0][0];
      const i1 = child.circuit.k_matrix[0][1];

      this.machine.k0 = net.makeOr(this, ast.Module, "global_k0");

      if (i0) i0.connectTo(this.machine.k0, net.FAN.STD);
      if (i1) i1.connectTo(this.machine.k0, net.FAN.STD);
   }

   if (child.circuit.k_matrix[1]) {
      const i0 = child.circuit.k_matrix[1][0];
      const i1 = child.circuit.k_matrix[1][1];

      this.machine.k1 = net.makeOr(this, ast.Module, "global_k1");
      if (i0) i0.connectTo(this.machine.k1, net.FAN.STD);
      if (i1) i1.connectTo(this.machine.k1, net.FAN.STD);
   }

   this.circuit = new Circuit(this, ast.Module,
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
/*    compile ...                                                      */
/*---------------------------------------------------------------------*/
function compile(machine, ast_node) {
   machine.nets = [];
   machine.input_signal_map = {};
   machine.output_signal_map = {};
   machine.local_signal_list = [];

   net.resetNetId();
   
   const sigtable = new Map();
   collectSigAccesses(ast_node, sigtable);
   
   // Elaboration and linking stage
   ast_node.acceptAuto(new ccutils.InitVisitor(machine));
   ast_node.accept(new ccutils.SignalVisitor(machine));
   ast_node.accept(new ccutils.TrapVisitor());

   ast.computeNodeRegisterId(ast_node, "0");
   ast.computeNodeDepth(ast_node, 1, false, false);

   ast_node.makeCircuit([], sigtable);

   machine.nets.forEach(net => net.reset(true));

   machine.boot_reg.value = true;

   if (machine.dumpNets) {
      machine.dumpNets(machine, false, ".nets-.json");
   }
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
