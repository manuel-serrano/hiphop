/*=====================================================================*/
/*    serrano/prgm/project/hiphop/0.2.x/lib/compiler.js                */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal                                       */
/*    Creation    :  Mon Jul 16 18:06:28 2018                          */
/*    Last change :  Thu Aug  2 15:54:58 2018 (serrano)                */
/*    Copyright   :  2018 serrano                                      */
/*    -------------------------------------------------------------    */
/*    HipHop compiler                                                  */
/*=====================================================================*/
"use strict"
"use hopscript"

const ast = require("./ast.js");
const error = require("./error.js");
const net = require("./net.js");
const signal = require("./signal.js");
const lang = require("./lang.js");

//
// Interface definition of a circuit. It also contains methods to get
// embeded RES, SUSP and KILL wires.
//
function Interface(ast_node, type, go_list, res, susp, kill_list, sel,
		   k_matrix) {
   this.ast_node = ast_node;
   this.type = type;

   if (!(go_list instanceof Array))
      throw error.TypeError("`go_list` must be an array.", ast_node.loc);
   this.go_list = go_list;

   if (kill_list && !(kill_list instanceof Array))
      throw error.TypeError("`kill_list` must be an array.", ast_node.loc);
   this.kill_list = kill_list;

   if (!(k_matrix instanceof Array))
      throw error.TypeError("`k_matrix must be a matrix.",
				    ast_node.loc);

   for (let i in k_matrix)
      if (!(k_matrix[i] instanceof Array))
	 throw error.TypeError("Each completion code of `k_matrix` " +
				       "must be an array.", ast_node.loc);
   this.k_matrix = k_matrix;

   this.res = res;
   this.susp = susp;
   this.sel = sel;
}

//
// Functions thats builds expression test / count tests.
//
ast.ExpressionNode.prototype.make_expression = function(node,
							start_nets,
							true_nets,
							false_nets,
							level) {
   let test_expr = null;
   let i;

   if (this.func || this.accessor_list.length > 0) {
      test_expr = new net.TestExpressionNet(this, node, "testexpr", level,
					    this.func, this.accessor_list);
      for (i in start_nets)
	 start_nets[i].connect_to(test_expr, net.FAN.STD);
      for (i in true_nets)
	 test_expr.connect_to(true_nets[i], net.FAN.STD);
      for (i in false_nets)
	 test_expr.connect_to(false_nets[i], net.FAN.NEG);
   }

   return test_expr;
}

ast.CountExpressionNode.prototype.make_counter = function(type,
							  start_nets,
							  reset_nets,
							  true_nets,
							  false_nets) {
   let counter = 0;
   let decr_counter_func = function() {
      if (counter > 0)
	 counter--;
      return counter == 0;
   }

   let decr_net = new net.TestExpressionNet(this, type, "decr_counter",
					    -1, decr_counter_func, []);
   let func_count = this.func_count;
   let init_counter_func = function() {
      //
      // on counter expression, func_count is *always* provideded
      //
      let init_val = parseInt(func_count.apply(this));

      if (init_val < 1)
	 error.RuntimeError("Assert counter expression > 0 failed.",
			    this.loc);
      counter = init_val;
   }

   let init_net = new net.ActionNet(this, type, "init_counter", 0,
				    init_counter_func,
				    this.accessor_list_count);
   let init_or = net.make_or(this, type, "init_or");

   for (let i in start_nets)
      start_nets[i].connect_to(decr_net, net.FAN.STD);
   init_or.connect_to(init_net, net.FAN.STD);
   for (let i in reset_nets)
      reset_nets[i].connect_to(init_or, net.FAN.STD);
   for (let i in true_nets)
      decr_net.connect_to(true_nets[i], net.FAN.STD);
   for (let i in false_nets)
      decr_net.connect_to(false_nets[i], net.FAN.NEG);
}

//
// Circuit translation functions.
//
ast.ASTNode.prototype.make_circuit = function() {
   throw error.TypeError("`make_circuit` must be implemented",
				 this.loc)
}

//
// This function must be called *only* in ast.*.make_circuit() and
// *never* in make_*. Otherwise, it could result that the oneshot
// register is push not on the top of dynamically added branch but
// inside an embded instruction
//
ast.ASTNode.prototype.push_oneshot_register = function() {
   if (this.dynamically_added_in_sel) {
      let reg = new net.RegisterNet(this, this.constructor, "oneshot_register");
      let const0 = net.make_or(this, this.constructor,
			       "oneshot_register_reset");

      const0.connect_to(reg, net.FAN.STD);
      reg.connect_to(const0, net.FAN.DEP);
      reg.connect_to(this.cinterface.go_list[this.depth], net.FAN.STD);
      reg.oneshot = true;

      this.dynamically_added_in_sel = false;
   }
}

ast.Fork.prototype.make_circuit = function() {
   let children_interface = [];

   for (let i in this.children) {
      this.children[i].make_circuit();
      children_interface[i] = this.children[i].cinterface;
   }

   this.cinterface = make_parallel(this, children_interface);
   this.push_oneshot_register();
}

function make_parallel(ast_node, children_interface) {
   let go_list = [];
   let res = null;
   let susp = null;
   let kill_list = null;
   let sel = null;
   let k_matrix = [];

   //
   // Broadcast GO
   //
   for (let l = 0; l <= ast_node.depth; l++) {
      for (let c in children_interface) {
	 let child_go = children_interface[c].go_list[l];

	 if (child_go) {
	    if (!go_list[l])
	       go_list[l] = net.make_or(ast_node, ast.Fork, "go", l);
	    go_list[l].connect_to(child_go, net.FAN.STD);
	 }
      }
   }

   //
   // Broadcast RES, SUSP, KILL
   //
   res = get_res_children(ast_node, ast.Fork, children_interface);
   susp = get_susp_children(ast_node, ast.Fork, children_interface);
   kill_list = killListChildren(ast_node, ast.Fork, children_interface);

   //
   // Union on SEL
   //
   for (let c in children_interface) {
      let child_sel = children_interface[c].sel;

      if (child_sel) {
	 if (!sel)
	    sel = net.make_or(ast_node, ast.Fork, "sel");
	 child_sel.connect_to(sel, net.FAN.STD);
      }
   }

   //
   // --------------------- Synchronizer ---------------------
   //

   //
   // union is a matrix which is indexed by return code and then by
   // incarnation level.
   //
   let union = [];

   //
   // min is a 3D array which is indexed by children, by return code
   // and then by incarnation level
   //
   let min = [];

   //
   // max completion code of the parallel + 1
   //
   let max = 0;

   for (let c in children_interface) {
      if (children_interface[c].k_matrix.length > max) {
	 max = children_interface[c].k_matrix.length;
      }
   }

   //
   // Union K of children
   //
   for (let c in children_interface) {
      let iChild = children_interface[c];
      for (let k = 0; k < max; k++) {
	 if (!union[k]) {
	    union[k] = [];
	    for (let i = 0; i <= ast_node.depth; i++) {
	       union[k][i] = net.make_or(ast_node, ast.Fork, "union_k" + k, i);
	    }
	 }
	 let kList = get_k_list_child(ast_node, ast.Fork, iChild, k);
	 for (let i = 0; i <= ast_node.depth; i++) {
	    if (kList[i]) {
	       kList[i].connect_to(union[k][i], net.FAN.STD);
	    }
	 }
      }
   }

   // //
   // // Union K of children
   // //
   // for (let k = 0; k < max; k++) {
   //    union[k] = [];

   //    for (let l = 0; l <= ast_node.depth; l++) {
   // 	 union[k][l] = net.make_or(ast_node, ast.Fork, "union_k" + k, l)

   // 	 for (let c in children_interface) {
   // 	    let k_list = children_interface[c].k_matrix[k]

   // 	    if (k_list && k_list[l])
   // 	       k_list[l].connect_to(union[k][l], net.FAN.STD)
   // 	 }
   //    }
   // }

   //
   // Connect EXIT to KILL
   //
   if (kill_list) {
      for (let k = 2; k < union.length; k++) {
	 for (let l in union[k]) {
	    if (!kill_list[l]) {
	       kill_list[l] = net.make_or(ast_node, ast.Fork, "pkill", l);
	    }
	    union[k][l].connect_to(kill_list[l], net.FAN.STD);
	 }
      }
   }

   //
   // Min of children
   //
   for (let c in children_interface) {
      let child_interface = children_interface[c];
      let child_k_matrix = child_interface.k_matrix;
      let child_min_matrix = [];

      min[c] = child_min_matrix;
      child_min_matrix[0] = [];

      //
      // connect all incarnation of K0 of child
      //
      for (let l = 0; l <= ast_node.depth; l++) {
	 child_min_matrix[0][l] = net.make_or(ast_node, ast.Fork,
					      "or_min_k0" + "_child" + c, l);
	 if (child_k_matrix[0] && child_k_matrix[0][l])
	    child_k_matrix[0][l].connect_to(child_min_matrix[0][l],
					    net.FAN.STD);
      }

      //
      // connect OR-NOT door with GO of parallel and SEL of child
      //
      let sel_not = net.make_or(ast_node, ast.Fork, "sel_not_child" + c);

      go_list[ast_node.depth].connect_to(sel_not, net.FAN.STD);
      if (child_interface.sel)
	 child_interface.sel.connect_to(sel_not, net.FAN.STD);
      sel_not.connect_to(child_min_matrix[0][ast_node.depth], net.FAN.NEG)

      //
      // connect all incarnation of child min Kn-1 to child min Kn
      //
      for (let k = 1; k < max; k++) {
	 child_min_matrix[k] = [];

	 for (let l = 0; l <= ast_node.depth; l++) {
	    child_min_matrix[k][l] = net.make_or(ast_node, ast.Fork,
						 "or_min_k" + k + "_child" + c,
						 l);
	    child_min_matrix[k - 1][l].connect_to(child_min_matrix[k][l],
						  net.FAN.STD);
	    if (child_k_matrix[k] && child_k_matrix[k][l])
	       child_k_matrix[k][l].connect_to(child_min_matrix[k][l],
					       net.FAN.STD);
	 }
      }
   }

   //
   // Build K output doors and connect union to them
   //
   for (let k in union) {
      k_matrix[k] = [];
      for (let l in union[k]) {
	 k_matrix[k][l] = net.make_and(ast_node, ast.Fork, "and_k" + k, l);
	 union[k][l].connect_to(k_matrix[k][l], net.FAN.STD);
      }
   }

   //
   // Connect min to K output doors
   //
   for (let c in min)
      for (let k in min[c])
	 for (let l in min[c][k])
	    min[c][k][l].connect_to(k_matrix[k][l], net.FAN.STD);

   return new Interface(ast_node, ast.Fork, go_list, res, susp,
    			kill_list, sel, k_matrix);
}

ast.Trap.prototype.make_circuit = function() {
   this.children[0].make_circuit();
   this.cinterface = make_trap(this, this.children[0].cinterface);
   this.push_oneshot_register();
}

function make_trap(ast_node, child_interface) {
   if (child_interface.k_matrix.length <= 2)
      return child_interface;

   let k0_list = [];
   let k_matrix_child = child_interface.k_matrix;
   let k_matrix = [k0_list];
   let k0_list_child = get_k_list_child(ast_node, ast.Trap, child_interface, 0);
   let trap_gate_list = get_k_list_child(ast_node, ast.Trap,
					 child_interface, 2);

   //
   // Get K0 of child, and connect it to K0 output door
   //
   for (let l in k0_list_child) {
      k0_list[l] = net.make_or(ast_node, ast.Trap, "or_k0", l);
      k0_list_child[l].connect_to(k0_list[l], net.FAN.STD);
   }

   //
   // Get K2 of child, and connect it to K0 output door
   //
   for (let l in trap_gate_list) {
      if (!k0_list[l])
	  k0_list[l] = net.make_or(ast_node, ast.Trap, "or_k0", l);
      trap_gate_list[l].connect_to(k0_list[l], net.FAN.STD);
   }

   //
   // Propagate K1 of child and Shift K > 2
   //
   k_matrix[1] = get_k_list_child(ast_node, ast.Trap, child_interface, 1);
   for (let k = 3; k < k_matrix_child.length; k++)
      k_matrix[k - 1] = get_k_list_child(ast_node, ast.Trap,
					 child_interface, k);

   return new Interface(ast_node, ast.Trap,
			child_interface.go_list,
			child_interface.res,
			child_interface.susp,
			killListChildren(ast_node, ast.Trap, [child_interface]),
			child_interface.sel,
			k_matrix);
}

ast.Exit.prototype.make_circuit = function() {
   this.cinterface = make_exit(this);
   this.push_oneshot_register();
}

function make_exit(ast_node) {
   let go_list = [];
   let k_matrix = [];

   k_matrix[ast_node.return_code] = [];
   // for (let i = 0; i <= ast_node.return_code; i++)
   //    k_matrix[i] = [];

   for (let i = 0; i <= ast_node.depth; i++) {
      let go = net.make_or(ast_node, ast.Exit, "go", i);

      go_list[i] = go;
      k_matrix[ast_node.return_code][i] = go;
   }

   return new Interface(ast_node, ast.Exit, go_list, null, null, null, null,
			k_matrix);
}

ast.Sequence.prototype.make_circuit = function() {
   let children_interface = [];

   for (let i in this.children) {
      this.children[i].make_circuit();
      children_interface[i] = this.children[i].cinterface;
   }

   this.cinterface = make_sequence(this, children_interface);
   this.push_oneshot_register();
}

function make_sequence(ast_node, children_interface) {
   let len = children_interface.length;
   let sel = null;
   let k_matrix = [[]];
   let i = 0;

   for (i = 0; i < len; i++) {
      let child_interface = children_interface[i];

      //
      // connect each KO incarnation of child[N] to each GO
      // incarnation of child[N + 1]
      //
      if (i + 1 < len) {
	 let next_depth = children_interface[i + 1].ast_node.depth;
	 let next_go_list = children_interface[i + 1].go_list;

	 for (let l = 0; l <= child_interface.ast_node.depth; l++) {
	    if (!child_interface.k_matrix[0] || !child_interface.k_matrix[0][l])
	       continue;
	    let next_l = l;

	    if (l > next_depth)
	       next_l = next_depth;
	    child_interface.k_matrix[0][l].connect_to(next_go_list[next_l],
						      net.FAN.STD);
	 }
      }

      //
      // connect SEL if needed
      //
      if (child_interface.sel) {
	 if (!sel)
	    sel = net.make_or(ast_node, ast.Sequence, "sel");
	 child_interface.sel.connect_to(sel, net.FAN.STD);
      }

      //
      // connects Kn where n > 0
      //
      for (let j = 1; j < child_interface.k_matrix.length; j++) {
	 let kList = get_k_list_child(ast_node, ast.Sequence, child_interface, j);

	 if (!k_matrix[j]) {
	    k_matrix[j] = [];
	 }

	 for (let l in kList) {
	    if (!k_matrix[j][l]) {
	       k_matrix[j][l] = net.make_or(ast_node, ast.Sequence, "buf_k" + j + "_buffer_output", l);
	    }
	    kList[l].connect_to(k_matrix[j][l], net.FAN.STD);
	 }
      }
   }

   //
   // get K0 of last child
   //
   k_matrix[0] = get_k_list_child(ast_node, ast.Sequence,
				  children_interface[len - 1], 0)

   //
   // get RES of children
   //
   let res = get_res_children(ast_node, ast.Sequence, children_interface);

   //
   // get SUSP of children
   //
   let susp = get_susp_children(ast_node, ast.Sequence, children_interface);

   //
   // get KILL list of children
   //
   let kill_list = killListChildren(ast_node, ast.Sequence, children_interface);

   return new Interface(ast_node, ast.Sequence, children_interface[0].go_list,
			res, susp, kill_list, sel, k_matrix);
}

ast.Pause.prototype.make_circuit = function() {
   this.cinterface = make_pause(this);
   this.push_oneshot_register();
}

function make_pause(ast_node) {
   let go_list = [];
   let kill_list = [];
   let k_matrix = [[], []];
   let reg = new net.RegisterNet(ast_node, ast.Pause, "reg");
   let and_to_reg = net.make_and(ast_node, ast.Pause, "and_to_reg");
   let or_to_reg = net.make_or(ast_node, ast.Pause, "or_to_reg");
   let and_to_k0 = net.make_and(ast_node, ast.Pause, "and_to_k0");

   and_to_reg.connect_to(or_to_reg, net.FAN.STD);
   or_to_reg.connect_to(reg, net.FAN.STD);
   reg.connect_to(and_to_k0, net.FAN.STD);
   reg.connect_to(and_to_reg, net.FAN.STD);
   k_matrix[0][ast_node.depth] = and_to_k0;

   for (let i = 0; i <= ast_node.depth; i++) {
      let go = net.make_or(ast_node, ast.Pause, "go", i);
      go_list[i] = go;
      k_matrix[1][i] = go;

      let kill = net.make_or(ast_node, ast.Pause, "kill", i);
      kill_list[i] = kill;

      let and = net.make_and(ast_node, ast.Pause, "and", i);
      go.connect_to(and, net.FAN.STD);
      kill.connect_to(and, net.FAN.NEG);
      and.connect_to(or_to_reg, net.FAN.STD);
   }

   kill_list[ast_node.depth].connect_to(and_to_reg, net.FAN.NEG);

   return new Interface(ast_node, ast.Pause, go_list, and_to_k0, and_to_reg,
			kill_list, reg, k_matrix);
}

ast.Await.prototype.make_circuit = function() {
   this.cinterface = make_await(this);
}

function make_await(ast_node) {
   return make_abort(ast_node, make_halt(ast_node));
}

ast.Every.prototype.make_circuit = function() {
   this.children[0].make_circuit();
   this.cinterface = make_sequence(this,
				   [make_await(this),
				    make_loopeach(this,
						  this.children[0].cinterface)])
   this.push_oneshot_register();
}

ast.LoopEach.prototype.make_circuit = function() {
   this.children[0].make_circuit();
   this.cinterface = make_loopeach(this, this.children[0].cinterface);
   this.push_oneshot_register();
}

function make_loopeach(ast_node, child_interface) {
   return make_loop(ast_node,
		    make_abort(ast_node,
			       make_sequence(ast_node,
					     [child_interface,
					      make_halt(ast_node)]),
			       true));
}

ast.Loop.prototype.make_circuit = function() {
   this.children[0].make_circuit();
   this.cinterface = make_loop(this, this.children[0].cinterface);
   this.push_oneshot_register();
}

function make_loop(ast_node, child_interface) {
   let depth1 = ast_node.depth;
   let depth2 = child_interface.ast_node.depth;
   let go_list = [];
   let k_matrix = [[]];

   for (let l = 0; l <= depth1; l++) {
      let or =  net.make_or(ast_node, ast.Loop, "go", l);

      or.connect_to(child_interface.go_list[l], net.FAN.STD);
      go_list[l] = or;
   }

   //
   // Error on instantaneous loop, and connect K0[depth2] on K0[depth1]
   //
   for (let l = 0; l <= depth2; l++)
      if (child_interface.k_matrix[0][l] && (depth2 == 0 || l < depth2))
	 child_interface.k_matrix[0][l].connect_to(
	    new net.ActionNet(ast_node, ast.Loop, "error", l,
			      function() {
				 throw error.TypeError(
				    "Instantaneous loop.", ast_node.loc ) },
			      [] ),
	    net.FAN.STD);

   if (child_interface.k_matrix[0][depth2]) {
      child_interface.k_matrix[0][depth2].connect_to(go_list[depth1],
						     net.FAN.STD);
   }

   for (let k = 1; k < child_interface.k_matrix.length; k++) {
      k_matrix[k] = get_k_list_child(ast_node, ast.Loop, child_interface, k);
   }

   let kill_list =  killListChildren(ast_node, ast.Loop, [child_interface]);

   return new Interface(ast_node, ast.Loop, go_list, child_interface.res,
			child_interface.susp, kill_list, child_interface.sel,
			k_matrix);
}

ast.Nothing.prototype.make_circuit = function() {
   this.cinterface = make_nothing(this);
   this.push_oneshot_register();
}

function make_nothing(ast_node) {
   let go_list = [];
   let k_matrix = [[]];

   for (let i = 0; i <= ast_node.depth; i++) {
      let go = net.make_or(ast_node, ast.Nothing, "go", i);

      go_list[i] = go;
      k_matrix[0][i] = go;
   }

   return new Interface(ast_node, ast.Nothing, go_list, null, null, null, null,
			k_matrix);
}

ast.Atom.prototype.make_circuit = function() {
   let go_list = [];
   let k_matrix = [go_list];

   for (let i = 0; i <= this.depth; i++) {
      let go = net.make_or(this, ast.Atom, "go", i);
      let action = new net.ActionNet(this, ast.Atom, "action", i, this.func,
				     this.accessor_list);

      go.connect_to(action, net.FAN.STD);
      go_list[i] = go;

   }

   this.cinterface = new Interface(this, ast.Atom, go_list, null, null, null,
				   null, k_matrix);
   this.push_oneshot_register();
}

ast.Suspend.prototype.make_circuit = function() {
   this.children[0].make_circuit();
   this.cinterface = make_suspend(this, this.children[0].cinterface);
   this.push_oneshot_register();
}

function make_suspend(ast_node, child_interface) {
   let and1 = net.make_and(ast_node, ast.Suspend, "and1_sel_res");
   let and2 = net.make_and(ast_node, ast.Suspend, "and2_negtest_and1");
   let and3 = net.make_and(ast_node, ast.Suspend, "and3_test_and1");
   let or1 = net.make_or(ast_node, ast.Suspend, "or1_susp_and3");
   let or2 = net.make_or(ast_node, ast.Suspend, "or2_k1_and3");
   let k_matrix = [];

   and1.connect_to(and2, net.FAN.STD);
   and1.connect_to(and3, net.FAN.STD);
   and3.connect_to(or1, net.FAN.STD);
   and3.connect_to(or2, net.FAN.STD);

   if (child_interface.sel) {
      child_interface.sel.connect_to(and1, net.FAN.STD);
   }

   if (child_interface.res) {
      and2.connect_to(child_interface.res, net.FAN.STD);
   }

   if (child_interface.susp) {
      or1.connect_to(child_interface.susp, net.FAN.STD);
   }

   ast_node.make_expression(ast.Suspend, [and1], [and3], [and2],
			    ast_node.depth);

   for (let k = 0; k < child_interface.k_matrix.length; k++) {
      k_matrix[k] = get_k_list_child(ast_node, ast.Suspend, child_interface, k);
   }

   if (k_matrix[1][ast_node.depth]) {
      or2.connect_to(k_matrix[1][ast_node.depth], net.FAN.STD);
   }

   let killList = killListChildren(ast_node, ast.Suspend, [child_interface]);

   return new Interface(ast_node, ast.Suspend, child_interface.go_list,
			and1, or1, killList, child_interface.sel, k_matrix);
}

ast.WeakAbort.prototype.make_circuit = function() {
   this.children[0].make_circuit();
   this.cinterface = this.children[0].cinterface;
   this.push_oneshot_register();
}

ast.Abort.prototype.make_circuit = function() {
   this.children[0].make_circuit();
   this.cinterface = make_abort(this, this.children[0].cinterface);
   this.push_oneshot_register();
}

function make_abort(ast_node, child_interface, force_non_immediate=false) {
   if (!force_non_immediate && ast_node.immediate)
      return make_if(ast_node, [make_nothing(ast_node),
				_make_abort(ast_node, child_interface)])
   else
      return _make_abort(ast_node, child_interface);
}

function _make_abort(ast_node, child_interface) {
   let and1 = net.make_and(ast_node, ast.Abort, "and1_sel_res");
   let and2 = net.make_and(ast_node, ast.Abort, "and2_negtest_and1");
   let and3 = net.make_and(ast_node, ast.Abort, "and3_test_and1");
   let or = net.make_or(ast_node, ast.Abort, "or_and3_k0");
   let go_list = [];
   let k_matrix = [[]];

   for (let l = 0; l <= ast_node.depth; l++) {
      let go = net.make_or(ast_node, ast.Abort, "go", l);

      go.connect_to(child_interface.go_list[l], net.FAN.STD);
      go_list[l] = go;
   }

   //
   // Special case for Exec
   //
   if (ast_node instanceof ast.Exec) {
      ast_node.exec_status.callback_wire.connect_to(and3, net.FAN.STD);
      ast_node.exec_status.callback_wire.connect_to(and2, net.FAN.NEG);
   } else if (ast_node.func_count) {
      //
      // If a counter must be created, AND and AND-not gates must be
      // connected only on the counter output (and not on expr test)
      //
      let decr_list = [];

      decr_list[0] = ast_node.make_expression(ast.Abort, [and1], [], [],
					      ast_node.depth);
      decr_list[1] = and1;
      ast_node.make_counter(ast.Abort, decr_list, go_list, [and3], [and2]);
   } else {
      ast_node.make_expression(ast.Abort, [and1], [and3], [and2],
			       ast_node.depth);
   }

   and1.connect_to(and2, net.FAN.STD);
   and1.connect_to(and3, net.FAN.STD);
   and3.connect_to(or, net.FAN.STD);

   //
   // connect SEL of subcircuit
   //
   if (child_interface.sel)
      child_interface.sel.connect_to(and1, net.FAN.STD);

   //
   // connect to RES of subcircuit
   //
   if (child_interface.res)
      and2.connect_to(child_interface.res, net.FAN.STD);

   //
   // connect K0 on depth
   //
   let k0 = child_interface.k_matrix[0][child_interface.ast_node.depth]
   if (k0)
      k0.connect_to(or, net.FAN.STD);
   k_matrix[0][ast_node.depth] = or;

   //
   // connect K0 on surface and Kn
   //
   for (let l = 0; l < ast_node.depth; l++)
      k_matrix[0][l] = child_interface.k_matrix[0][l];

   for (let k = 1; k < child_interface.k_matrix.length; k++)
      k_matrix[k] = get_k_list_child(ast_node, ast.Abort, child_interface, k);

   let kill_list = killListChildren(ast_node, ast.Abort, [child_interface]);

   return new Interface(ast_node, ast.Abort, go_list, and1,
			child_interface.susp, kill_list, child_interface.sel,
			k_matrix);
}

ast.Emit.prototype.make_circuit = function() {
   this.cinterface = make_emit(this);
   this.push_oneshot_register();
}

/*---------------------------------------------------------------------*/
/*    _make_emit ...                                                   */
/*---------------------------------------------------------------------*/
function _make_emit( ast_node, signal_name ) {
   let go_list = [];
   let k_matrix = [[]];

   for (let i = 0; i <= ast_node.depth; i++) {
      let go = net.make_or(ast_node, ast.Emit, signal_name + "_go", i);
      let sig_gate = getSignalGate( ast_node.machine,
				    ast_node.tag, ast_node.loc,
				    signal_name, i );
      let sig = getSignalObject( ast_node.machine,
				 ast_node.tag, ast_node.loc,
				 signal_name );

      go.connect_to(sig_gate, net.FAN.STD);
      go_list[i] = go;

      //
      // Special case for exec
      //
      if (ast_node instanceof ast.Exec) {
	 k_matrix[0][i] = go;
	 ast_node.signal = sig;
	 let exec_emission_func = function() {
	    sig.set_value( ast_node.exec_status.value, ast_node.loc )
	    ast_node.exec_status.value = undefined;
	 }

	 go.connect_to(new net.ActionNet(ast_node, ast.Emit, "_exec_return_sig",
					 i, exec_emission_func, []),
		       net.FAN.STD);
      } else {
	 //
	 // Warning: the key must be signal_name and *not* sig.name, in
	 // case of bouded signals.
	 //
	 ast_node.signal_map[signal_name] = sig;

	 if (ast_node.func || ast_node.accessor_list.length > 0) {
	    let expr = new net.SignalExpressionNet(ast_node, ast.Emit, sig,
						   signal_name +
						   "_signal_expr", i);
	    go.connect_to(expr, net.FAN.STD);
	    k_matrix[0][i] = expr;
	 } else {
	    k_matrix[0][i] = go;
	 }
      }
   }

   return new Interface(ast_node, ast.Emit, go_list, null, null, null,
			null, k_matrix);
}

function _make_emit_if(ast_node) {
   let emit_node;

   if (ast_node.signal_name_list.length == 1)
      emit_node = _make_emit(ast_node, ast_node.signal_name_list[0]);
   else
      emit_node = make_sequence(ast_node, ast_node.signal_name_list.map(
	 function(el, i, arr) {
	    return _make_emit(ast_node, el);
	 }));

   //
   // That burn the eyes and it will probably broke one day, but it
   // allows to keep the intermediate representation like the source
   // code, therefore, it makes easier the debugging of HH when use
   // pretty-printer/debugger...
   //
   // Basically, we build a dummy If AST node, giving it if_func and
   // if_accessor_list of the Emit node, to be able to build a if
   // circuit, with the emit in then branch.
   //
   if (ast_node.if_func) {
      let if_circuit;
      let nothing_circuit;
      let if_ast = new ast.If(undefined, ast_node.loc, true, [], false,
			      ast_node.if_func, ast_node.if_accessor_list);

      if_ast.machine = ast_node.machine;
      if_ast.depth = ast_node.depth;
      nothing_circuit = make_nothing(if_ast);
      if_circuit = make_if(if_ast, [emit_node, nothing_circuit]);

      return if_circuit;
   }

   return emit_node;
}

function make_emit(ast_node) {
   if (ast_node instanceof ast.Exec)
      return _make_emit(ast_node, ast_node.signal_name);
   return _make_emit_if(ast_node);
}

ast.Sustain.prototype.make_circuit = function() {
   this.cinterface = make_loop(this, make_sequence(this,
						   [make_emit(this),
						    make_pause(this)]));
   this.push_oneshot_register();
}

ast.If.prototype.make_circuit = function() {
   this.children[0].make_circuit();
   this.children[1].make_circuit();
   this.cinterface = make_if(this, [this.children[0].cinterface,
				    this.children[1].cinterface]);
   this.push_oneshot_register();
}

function make_if(ast_node, children_interface) {
   let go_list = [];
   let sel = null;

   for (let i = 0; i <= ast_node.depth; i++) {
      let go = net.make_or(ast_node, ast.If, "go", i);
      let and_then = net.make_and(ast_node, ast.If, "and_then", i);
      let and_else = net.make_and(ast_node, ast.If, "and_else", i);

      if (ast_node.not)
 	 ast_node.make_expression(ast.If, [go], [and_else], [and_then], i);
      else
	 ast_node.make_expression(ast.If, [go], [and_then], [and_else], i);

      go.connect_to(and_then, net.FAN.STD);
      go.connect_to(and_else, net.FAN.STD);

      and_then.connect_to(children_interface[0].go_list[i], net.FAN.STD);
      and_else.connect_to(children_interface[1].go_list[i], net.FAN.STD);

      go_list[i] = go;
   }

   for (let i in children_interface)
      if (children_interface[i].sel) {
	 if (!sel)
	    sel = net.make_or(ast_node, ast.If, "sel");
	 children_interface[i].sel.connect_to(sel, net.FAN.STD);
      }

   //
   // get RES of children
   //
   let res = get_res_children(ast_node, ast.If, children_interface);

   //
   // get SUSP of children
   //
   let susp = get_susp_children(ast_node, ast.If, children_interface);

   //
   // get KILL list of children
   //
   let kill_list = killListChildren(ast_node, ast.If, children_interface);

   //
   // get Kn list of children, make union of then
   //
   let k_matrix = [];
   let k_matrix_then = children_interface[0].k_matrix;
   let k_matrix_else = children_interface[1].k_matrix;
   let max_k = Math.max(k_matrix_then.length, k_matrix_else.length) - 1;
   for (let ki = 0; ki <= max_k; ki++) {
      let k_list_then = get_k_list_child(ast_node, ast.If,
					 children_interface[0], ki);
      let k_list_else = get_k_list_child(ast_node, ast.If,
					 children_interface[1], ki);
      k_matrix[ki] = [];
      for (let kl = 0; kl <= ast_node.depth; kl++) {
	 let union = net.make_or(ast_node, ast.If, "k", + ki + "_union_buffer",
				 ki);
	 k_matrix[ki][kl] = union;
	 if (k_list_then[kl]) {
	    k_list_then[kl].connect_to(union, net.FAN.STD);
	 }
	 if (k_list_else[kl]) {
	    k_list_else[kl].connect_to(union, net.FAN.STD);
	 }
      }
   }

   return new Interface(ast_node, ast.If, go_list, res, susp, kill_list, sel,
			k_matrix);
}

ast.Halt.prototype.make_circuit = function() {
   this.cinterface = make_halt(this);
   this.push_oneshot_register();
}

function make_halt(ast_node) {
   return make_loop(ast_node, make_pause(ast_node));
}

ast.Exec.prototype.make_circuit = function() {
   let exec_status = {
      id: undefined,
      value: undefined,
      active: false,
      prev_active: false,
      kill: false,
      prev_killed: false,
      suspended: false,
      prev_suspended: false,
      start: false,
      ast_node: this,

      //
      // abort of await use this wire instead of signal wire to know
      // when user routine is done
      //
      callback_wire: net.make_or(this, ast.Exec, "callback_wire"),

      func_start: this.func,
      func_susp: this.func_susp,
      func_kill: this.func_kill,
      func_res: this.func_res
   };
   exec_status.callback_wire.noSweep = true;
   this.machine.exec_status_list.push(exec_status);

   //
   // needed for particular case in Abort (via this nested Await
   // instruction) and Emit
   //
   this.exec_status = exec_status;

   //
   // make_await/sequence/emit take account of incarnation levels
   //
   let await_node = make_await(this);

   for(let l = 0; l <= this.depth; l++) {
      let start = new net.ActionNet(this, ast.Exec, "start", l, function() {
   	 exec_status.start = true;
	 exec_status.lvl = l;
      }, []);
      await_node.go_list[l].connect_to(start, net.FAN.STD);

      let kill = new net.ActionNet(this, ast.Exec, "kill", l, function() {
   	 exec_status.kill = true;
      }, []);
      await_node.kill_list[l].connect_to(start, net.FAN.NEG);
      await_node.kill_list[l].connect_to(kill, net.FAN.STD);

      //
      // kill handler must be called in case of abortion
      //
      let andDetectAbort = new net.ActionNet(this, ast.Exec, "abort", l, function() {
	 exec_status.kill = true;
      }, []);
      await_node.res.connect_to(andDetectAbort, net.FAN.NEG);
      await_node.susp.connect_to(andDetectAbort, net.FAN.NEG);
      await_node.sel.connect_to(andDetectAbort, net.FAN.STD);

      let susp = new net.ActionNet(this, ast.Exec, "susp", l, function() {
   	 exec_status.suspended = true;
      }, []);
      await_node.susp.connect_to(susp, net.FAN.STD);
      await_node.sel.connect_to(susp, net.FAN.STD);

      let res = new net.ActionNet(this, ast.Exec, "res", l, function() {
   	 exec_status.suspended = false;
      }, []);
      await_node.res.connect_to(res, net.FAN.STD);
      await_node.sel.connect_to(res, net.FAN.STD);

      signal.runtimeSignalAccessor(this, this.accessor_list, l);
   }

   if (this.signal_name) {
      this.cinterface = make_sequence(this, [await_node, make_emit(this)]);
   } else {
      this.cinterface = await_node;
   }
}

ast.Run.prototype.make_circuit = function() {
   this.children[0].make_circuit();
   this.cinterface = this.children[0].cinterface;
   this.push_oneshot_register();
}

/*---------------------------------------------------------------------*/
/*    make_circuit ...                                                 */
/*---------------------------------------------------------------------*/
ast.Local.prototype.make_circuit = function() {
   let sig;
   let go_list = [];
   let child = this.children[0];
   let res = net.make_or(this, ast.Local, "res_buf");

   //
   // As child circuit can use signal declared in this local, we need to
   // build them first. As we don't know yet if the child circuit uses
   // k1, kill or susp, we have to use buffers...
   //
   let k_matrix = [[], []];
   let kill_list = [];
   let susp = net.make_or(this, ast.Local, "susp_buf");
   let initList = [];

   for (let i = 0; i <= this.depth; i++) {
      k_matrix[1][i] = net.make_or(this, ast.Local, "k1_output_buffer", i);
      kill_list[i] = net.make_or(this, ast.Local, "kill_output_buffer", i);
      go_list[i] = net.make_or(this, ast.Local, "go", i);
   }

   //
   // Generation of signal in the Local scope.  For now, Only not
   // bounded signal are created, and `accessibility` is ignored.
   //
   for (let i in this.signal_declaration_list) {
      let sigdecl = this.signal_declaration_list[i];

      if (!sigdecl.bound) {
	 let s = new signal.Signal(this, sigdecl, ast.Local, k_matrix[1],
				   kill_list, susp);

	 sigdecl.signal = s;
	 this.machine.local_signal_list.push(s);

	 //
	 // Reinstantiation of local signal. Involves the call to
	 // reset function and the call of init function (which has
	 // dependencies). Same of reinit (happens on RES, or GO if no
	 // init provided).
	 //
	 for (let l = 0; l <= this.depth; l++) {
	    let action_init = new net.ActionNet(
	       this, ast.Local, "init", l, function() {
		  signal.create_scope.call(
		     this, s);
	       }, s.init_accessor_list);
	    go_list[l].connect_to(action_init, net.FAN.STD);
	    initList.push(action_init);

	    let action_reinit = new net.ActionNet(
	       this, ast.Local, "reinit", l, function() {
		  signal.resume_scope.call(
		     this, s);
	       }, s.reinit_accessor_list);
	    res.connect_to(action_reinit, net.FAN.STD);
	 }
      } else {
	 //
	 // The signal is bounded. Hence, we have to reference the
	 // signal attribute of the signal property to the signal
	 // object. This attribute is empty when the signal property
	 // comes from module used in a run statement.
	 //
	 if (!sigdecl.signal)
	    sigdecl.signal = getSignalObject( this.machine, "LOCAL",
					      this.loc, sigdecl.bound );
      }
   }

   //
   // Child circuit generation and connexion
   //
   this.machine.cc_local_signal_stack.push(this.signal_declaration_list);
   child.make_circuit();
   this.machine.cc_local_signal_stack.pop();

   //
   // Connect kill_list buffers to nested kill_list buffers
   //
   let nestedKillList = killListChildren(this, ast.Local, [child.cinterface]);
   if (nestedKillList) {
      for (let i in kill_list) {
	 kill_list[i].connect_to(nestedKillList[i], net.FAN.STD);
      }
   }

   //
   // connect child circuit to buffers res, k1, kill and susp
   //
   if (child.cinterface.res)
      res.connect_to(child.cinterface.res, net.FAN.STD);

   if (child.cinterface.susp)
      susp.connect_to(child.cinterface.susp, net.FAN.STD);

   k_matrix[0] = get_k_list_child(this, ast.Local, child.cinterface, 0);
   for (let i = 2; i < child.cinterface.k_matrix.length; i++)
      k_matrix[i] = get_k_list_child(this, ast.Local, child.cinterface, i)

   for (let i in child.cinterface.k_matrix[1]) {
      let lvl = i > this.depth ? this.depth : i;
      child.cinterface.k_matrix[1][i].connect_to(k_matrix[1][lvl], net.FAN.STD);
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
      let go = initList[l] ? initList[l] : go_list[l];
      go.connect_to(child.cinterface.go_list[l], net.FAN.STD);
   }

   this.cinterface = new Interface(this, ast.Local, go_list, res, susp,
				   kill_list, child.cinterface.sel, k_matrix);
   this.push_oneshot_register();
}

ast.Module.prototype.make_circuit = function() {
   let boot_reg = new net.RegisterNet(this, ast.Module, "global_boot_register");
   let const0 = net.make_or(this, ast.Module, "global_const0");
   const0.noSweep = true;

   //
   // It's mandatory that `boot_reg` propagate BEFORE `const0` the
   // first reaction. It's OK with current known list, but keep that
   // in mind. (we also count make a dependency of `boot_reg` to
   // `const0`?)
   //
   const0.connect_to(boot_reg, net.FAN.STD);
   this.machine.boot_reg = boot_reg;

   //
   // Generation of global signal
   //
   let signalsReady = net.make_or(this, ast.Module, "global_signals_ready");
   boot_reg.connect_to(signalsReady, net.FAN.STD);
   for (let i in this.signal_declaration_list) {
      let sigdecl = this.signal_declaration_list[i];
      let s = new signal.Signal(this, sigdecl, ast.Module);

      if (sigdecl.accessibility == lang.IN ||
	  sigdecl.accessibility == lang.INOUT) {
	 this.machine.input_signal_map[s.name] = s;

	 //
	 // This is a bit hacky, but it allows to known from the
	 // reactive machine net list if this net is the one of a
	 // global input signal.
	 //
	 // This is important to fill the known list at the beginning
	 // of the reaction: is the net is from an global input
	 // signal, then it must check if the signal has been emitted
	 // by the environment. If it is, the net must be added in the
	 // known list.
	 //
	 // It is quicker and simpler than iterate on the
	 // input_signal_map (which was previously done).
	 //
	 s.gate_list[0].isGlobalInputSignalNet = true;
	 s.gate_list[0].signal = s;
      }

      if (sigdecl.accessibility == lang.OUT ||
	  sigdecl.accessibility == lang.INOUT) {
	 this.machine.output_signal_map[s.name] = s;
      }
      this.machine.global_signal_map[s.name] = s;

      //
      // Signal reinitialization overrides if exists signal
      // initialization.
      //
      if (s.reinit_func) {
	 let action_reinit = new net.ActionNet(
	    this, ast.Module, "reinit", 0, function() {
	       signal.resume_scope.call(this, s);
	    }, s.reinit_accessor_list);
	 const0.connect_to(action_reinit, net.FAN.NEG);
	 action_reinit.connect_to(signalsReady, net.FAN.DEP);
      } else if (s.init_func) {
	 let action_init = new net.ActionNet(
	    this, ast.Module, "init", 0, function() {
	       signal.create_scope.call(this, s);
	    }, s.init_accessor_list);
	 boot_reg.connect_to(action_init, net.FAN.STD);
	 action_init.connect_to(signalsReady, net.FAN.DEP);
      }
   }

   //
   // translation of program
   //
   let i = null;
   for (i in this.children) {
      this.children[i].make_circuit();
   }

   //
   // last children is the reactive program code
   //
   let child = this.children[i];
   let list = null;

   //
   // When signals are ready, send GO to program
   //
   signalsReady.connect_to(child.cinterface.go_list[0], net.FAN.STD);

   //
   // Connect res of circuit
   //
   if (child.cinterface.res)
      boot_reg.connect_to(child.cinterface.res, net.FAN.NEG);

   //
   // Connect kill (level 0) of circuit
   //
   if (child.cinterface.kill && child.cinterface.kill[0])
      const0.connect_to(child.cinterface.kill[i], net.FAN.STD);

   //
   // Connect susp of circuit
   //
   if (child.cinterface.susp)
      const0.connect_to(child.cinterface.susp, net.FAN.STD);

   //
   // Connect sel, K0 (level 0) and K1 (level 0)
   //
   this.machine.sel = child.cinterface.sel;
   if (child.cinterface.k_matrix[0]) {
      let i0 = child.cinterface.k_matrix[0][0];
      let i1 = child.cinterface.k_matrix[0][1];

      this.machine.k0 = net.make_or(this, ast.Module, "global_k0");
      if (i0)
	 i0.connect_to(this.machine.k0, net.FAN.STD);
      if (i1)
	 i1.connect_to(this.machine.k0, net.FAN.STD);
   }
   if (child.cinterface.k_matrix[1]) {
      let i0 = child.cinterface.k_matrix[1][0];
      let i1 = child.cinterface.k_matrix[1][1];

      this.machine.k1 = net.make_or(this, ast.Module, "global_k1");
      if (i0)
	 i0.connect_to(this.machine.k1, net.FAN.STD);
      if (i1)
	 i1.connect_to(this.machine.k1, net.FAN.STD);
   }

   //
   // Useless for the runtime, but simplify the design of the debugger.
   //
   let res = net.make_or(this, ast.Module, "global_res_for_debug");
   boot_reg.connect_to(res, net.FAN.NEG);
   this.cinterface = new Interface(this, ast.Module, [boot_reg], res, const0,
				   [const0], this.machine.sel,
				   [[this.machine.k0], [this.machine.k1]]);
}

//
// Helper function that gives a list of incarnation of K[n] from a
// substatement. It takes account of possible lower incarnation level of
// the superstatement.
//
function get_k_list_child(ast_node, type, child_interface, k) {
   let depth1 = ast_node.depth;
   let depth2 = child_interface.ast_node.depth;
   let k_list1 = [];
   let k_list2 = child_interface.k_matrix[k];
   if (!k_list2) {
      return k_list1;
   }

   for (let l in k_list2) {
      if (l <= depth1) {
   	 k_list1[l] = net.make_or(ast_node, type, "k" + k + "_buffer", l);
	 if (k_list2[l]) {
	    k_list2[l].connect_to(k_list1[l], net.FAN.STD);
	 }
      } else {
	 if (!k_list1[depth1]) {
	    k_list1[depth1] = net.make_or(ast_node, type,
					  "k" + k + "_buffer", l);
	 }
   	 k_list2[l].connect_to(k_list1[depth1], net.FAN.STD);
      }
   }

   return k_list1;
}

// function makeKMatrix(ast_node, type, children_interface) {
//    let kMatrix = [];
//    let depthParent = ast_node.depth;

//    for (let c in children_interface) {
//       let child = children_interface[c];
//       let depthChild = child.ast_node.depth;

//       for (let k = 0; k < child.k_matrix.length; k++) {
// 	 if (!kMatrix[k]) {
// 	    kMatrix[k] = [];
// 	 }

// 	 for (let i = 0; i <= depthChild; i++) {
// 	    let iParent = i <= depthParent ? i : depthParent;

// 	    if (!kMatrix[k][iParent]) {
// 	       kMatrix[k][iParent] = net.make_or(ast_node, type, "buf_k" + k,
// 						 iParent);
// 	    }

// 	    child.k_matrix[k][i].connect_to(kMatrix[k][iParent], net.FAN.STD);
// 	 }
//       }
//    }

//    return kMatrix;
// }

//
// Helper function that gives net buffer connected to RES wires of
// children
//
function get_res_children(ast_node, type, children_interface) {
   let res = null;

   if (children_interface.length == 1)
      res = children_interface[0].res;
   else
      for (let i in children_interface) {
	 let res_child = children_interface[i].res;

	 if (res_child) {
	    if (!res)
	       res = net.make_or(ast_node, type, "buffer_res");
	    res.connect_to(res_child, net.FAN.STD);
	 }
      }

   return res;
}

//
// Helper function that gives SUSP net buffer connected to SUSP wires
// of children
//
function get_susp_children(ast_node, type, children_interface) {
   let susp = null;

   if (children_interface.length == 1)
      susp = children_interface[0].susp;
   else
      for (let i in children_interface) {
	 let susp_child = children_interface[i].susp;

	 if (susp_child) {
	    if (!susp)
	       susp = net.make_or(ast_node, type, "buffer_susp");
	    susp.connect_to(susp_child, net.FAN.STD);
	 }
      }

   return susp;
}

//
// Helper function that gives KILL net list buffer connected to KILL
// list wires of children.
//
// It makes the environment translation of KILL wires (see Esterel
// Constructire Book, page 151).
//
function killListChildren(ast_node, type, children_interface) {
   let killList = null;

   for (let c in children_interface) {
      let child = children_interface[c];
      let childDepth = child.ast_node.depth;

      if (child.kill_list) {
	 if (!killList) {
	    killList = [];
	 }

	 for (let i = 0; i <= ast_node.depth; i++) {
	    if (!killList[i]) {
	       killList[i] = net.make_or(ast_node, type, "buf_kill", i);
	    }
	    killList[i].connect_to(child.kill_list[i], net.FAN.STD);
	 }

	 if (childDepth > ast_node.depth) {
	    if (childDepth != ast_node.depth + 1) {
	       throw error.TypeError("killListChildren: level error", ast_node.loc);
	    }

	    killList[ast_node.depth].connect_to(child.kill_list[childDepth],
						net.FAN.STD);
	 }
      }
   }

   return killList;
}

//
// Helper function that gives a signal gate at a specific incarnation
// level
//
function getSignalGate( machine, tag, loc, signal_name, lvl ) {
   let gate_list = getSignalObject( machine, tag, loc, signal_name ).gate_list;

   if (gate_list.length <= lvl)
      return gate_list[gate_list.length - 1];
   return gate_list[lvl];
}

//
// Helper function that gives a signal at a specific incarnation level
//
function getSignalPreGate( machine, tag, loc, signal_name ) {
   return getSignalObject( machine, tag, loc, signal_name ).pre_gate;
}

/*---------------------------------------------------------------------*/
/*    getSignalObject ...                                              */
/*    -------------------------------------------------------------    */
/*    Lookup function to a signal.                                     */
/*                                                                     */
/*    First, try to get a signal in the current scope. Second,         */
/*    unwind scope chain until the global scope. If no signal is no    */
/*    signal is found an arror is raised. If a global signal is found, */
/*    it is returned.                                                  */
/*                                                                     */
/*    If a local signal is found, it looks at the bound property of    */
/*    the signal. If empty, the local signal is returned. If it is not */
/*    empty, the function is called recursivly to find and return the  */
/*    bounding signal.                                                 */
/*                                                                     */
/*    Therefore, this function use machine.input/output_signal_map and */
/*    machine.cc_local_signal_stack.                                   */
/*---------------------------------------------------------------------*/
function getSignalObject( machine, tag, loc, signal_name, scope_offset=0 ) {
   let scope_len = machine.cc_local_signal_stack.length - 1;

   for( let i = scope_len - scope_offset; i >= 0; i-- ) {
      let prop_list = machine.cc_local_signal_stack[ i ];

      for( let j in prop_list ) {
	 let prop = prop_list[ j ];

	 if( prop.name == signal_name ) {
	    if (!prop.bound)
	       return prop.signal;
	    else
	       return getSignalObject( machine, tag, loc, prop.bound,
				       scope_offset + 1);
	 }
      }
   }

   let sig = machine.global_signal_map[ signal_name ];

   if( !sig ) {
      console.log( "loc=", loc );
      throw error.TypeError( tag + ": unknown signal `" + signal_name + "'.", loc);
   }

   return sig;
}

exports.getSignalObject = getSignalObject;

//
// Visitors and functions thats decorates the AST before circuit
// translation :
//
//    - assign machine reference to each ast node
//    - check unicity of instruction identifier (id XML field)
//    - assign module_instance_id to module/run/let[in run context] nodes
//
// Warning: the current implementation does not guarantee that a
// module instance identifier will be the same if branches containing
// run are added / removed between two reactions. It will be needed
// before the debuggers support that feature.
//
function InitVisitor(machine) {
   this.machine = machine;
   this.ids = [];
   this.next_module_instance_id = 0;
}

InitVisitor.prototype.visit = function(ast_node) {
   ast_node.machine = this.machine;

   ast_node.net_list = [];

   if (ast_node.id) {
      if (this.ids[ast_node.id])
	 throw error.SyntaxError("id `" + ast_node.id + "' must be unique", ast_node.loc);
      this.ids[ast_node.id] = true;
   }

   if (ast_node instanceof ast.Module) {
      ast_node.module_instance_id = this.next_module_instance_id++;
   } else if (ast_node instanceof ast.Run) {
      let id = this.next_module_instance_id++;
      ast_node.module_instance_id = id;
      ast_node.children[0].module_instance_id = id;
   }
}

//
// Check unicity of global signal names
// Check unicity of local signal name for a same scope level
// Check validity of bound attribute
//
// Note that the unicity check is useless while the front-end language
// is XML : if more than one attribute is given with the same name,
// only the last will be used.
//
function SignalVisitor(machine) {
   this.machine = machine;
   this.global_names = [];
   this.local_name_stack = [];
   this.local_frame_sz_stack = [];
}

/*---------------------------------------------------------------------*/
/*    visit ...                                                        */
/*---------------------------------------------------------------------*/
SignalVisitor.prototype.visit = function( ast_node ) {
   function _error_already_used( name, loc ) {
      throw error.SyntaxError( "Signal name `" + name + "' already used.",
			       loc );
   }

   let instanceof_let = ast_node instanceof ast.Local;

   if( ast_node instanceof ast.Module ) {
      for( let i in ast_node.signal_declaration_list ) {
	 let prop = ast_node.signal_declaration_list[ i ];

	 if( this.global_names.indexOf( prop.name ) > -1 ) {
	    _error_already_used( prop.name, ast_node.loc );
	 }
	 this.global_names.push( prop.name );
      }
   } else if( instanceof_let ) {
      let local_names = [];

      for( let i in ast_node.signal_declaration_list ) {
	 let prop = ast_node.signal_declaration_list[ i ];

	 if( local_names.indexOf(prop.name) > -1 ) {
	    _error_already_used( prop.name, ast_node.loc );
	 }
	 local_names.push( prop.name );

	 if( prop.bound ) {
	    let not_found = signal_name =>
		this.local_name_stack.indexOf( signal_name ) == -1 &&
		this.global_names.indexOf( signal_name ) == -1;

	    if( prop.bound == -1 ) {
	       //
	       // From a RUN statement.
	       //
	       if( not_found( prop.name ) ) {
		  prop.bound = "";
	       } else {
		  prop.bound = prop.name;
	       }
	    } else if( not_found( prop.bound ) ) {
	       throw error.SyntaxError( "Signal `" + prop.name + "' is " +
					"bound to an unknown signal " +
					prop.bound + ".", ast_node.loc );
	    }
	 }
      }

      this.local_name_stack = this.local_name_stack.concat( local_names );
      this.local_frame_sz_stack.push( local_names.length );
   }

   for( let c in ast_node.children ) {
      ast_node.children[c].accept( this );
   }

   if( instanceof_let ) {
      let sz = this.local_frame_sz_stack.pop();
      while( sz > 0 ) {
	 this.local_name_stack.pop();
	 sz--;
      }
   }
}

//
// Check trap names exists on Exit nodes
// Compute trap level
//
function TrapVisitor() {
   this.trap_stack = [];
}

TrapVisitor.prototype.visit = function(ast_node) {
   var ast_node_instanceof_trap = ast_node instanceof ast.Trap;

   if (ast_node_instanceof_trap) {
      this.trap_stack.push(ast_node.trap_name);
   }

   for (var i in ast_node.children)
      ast_node.children[i].accept(this);

   if (ast_node_instanceof_trap) {
      this.trap_stack.pop();
   } else if (ast_node instanceof ast.Exit) {
      if (this.trap_stack.indexOf(ast_node.trap_name) == -1)
	 throw error.SyntaxError("Unknown trap name " +
				 ast_node.trap_name + ".", ast_node.loc);

      let offset = this.trap_stack.length
	  - this.trap_stack.lastIndexOf(ast_node.trap_name) - 1;
      ast_node.return_code += offset;
   }
}

function compute_register_id(ast_node, seq="0") {
   ast_node.instr_seq = seq;
   ast_node.next_register_id = 0;

   let child_seq = 0;
   for (let i in ast_node.children)
      compute_register_id(ast_node.children[i], seq + child_seq++);
}

function compute_depth(ast_node, depth, in_loop, in_par_sig) {
   if (ast_node instanceof ast.Loop || ast_node instanceof ast.LoopEach) {
      in_loop = true;
      in_par_sig = false;
   } else if (ast_node instanceof ast.Fork ||
	      ast_node instanceof ast.Local) {
      in_par_sig = true;
      if (in_loop) {
	 depth++;
	 in_loop = false;
      }
   }

   if (ast_node instanceof ast.Module)
      ast_node.depth = 0;
   else
      ast_node.depth = depth;
   for (let i in ast_node.children)
      compute_depth(ast_node.children[i], depth, in_loop, in_par_sig);
}

function sweep(machine) {
   let netList = machine.nets.filter(net => net.noSweep ? false : true);

   function deleteFan(net, fan) {
      function _in(net, fan) {
	 let i = net.fanin_list.indexOf(fan);
	 if (i > -1) {
	    net.fanin_list.splice(i, 1);
	    _out(fan.net, fan.antagonist);
	 }
      }
      function _out(net, fan) {
	 let i = net.fanout_list.indexOf(fan);
	 if (i > -1) {
	    net.fanout_list.splice(i, 1);
	    _in(fan.net, fan.antagonist);
	 }
      }

      if (net.fanin_list.indexOf(fan) > -1) {
	 _in(net, fan);
      } else {
	 _out(net, fan);
      }
   }

   function deleteNet(net) {
      if (!net.fanout_list.length) {
      	 let astNetList = net.ast_node.net_list;
	 let idast = astNetList.indexOf(net);
	 if (idast > -1) {
      	    astNetList.splice(idast, 1);
	 }

      	 let machineNetList = machine.nets;
	 let idmach = machineNetList.indexOf(net);
	 if (idmach > -1) {
      	    machineNetList.splice(idmach, 1);
	 }

      }
   }

   function constantFolding(net) {
      net.fanout_list.slice().forEach(fan => {
	 if (fan.dependency) {
	    return;
	 }

	 let value = fan.polarity ? net.neutral : !net.neutral;
	 if (fan.net.neutral == value) {
	    deleteFan(net, fan);
	    if (!fan.net.fanin_list.length && !fan.net.noSweep) {
	       netList.push(fan.net);
	    }
	 } else if (!fan.net.noSweep) {
	    fan.net.neutral = value;
	    fan.net.fanin_list.slice().forEach(fanin => {
	       if (!fanin.dependency) {
	 	  deleteFan(fan.net, fanin);
	       }
	    });
	    if (!fan.net.fanin_list.length) {
	       netList.push(fan.net);
	    }
	 }
      });

      if (!net.fanout_list.length) {
	 deleteNet(net);
      }
   }

   function removeBuffer(buffer) {
      let fanin = buffer.fanin_list[0];

      buffer.fanout_list.slice().forEach(fanout => {
	 if (fanout.dependency) {
	    deleteFan(buffer, fanout);
	    fanin.net.connect_to(fanout.net, net.FAN.DEP);
	 } else if (!fanin.dependency) {
	    deleteFan(buffer, fanout);
	    fanin.net.connect_to(fanout.net, (fanin.polarity == fanout.polarity
					      ? net.FAN.STD
					      : net.FAN.NEG));
	 }
      });

      if (!buffer.fanout_list.length) {
	 deleteFan(buffer, fanin);
	 deleteNet(buffer);
      }
   }

   while (netList.length) {
      let net = netList.shift();
      let len = net.fanin_list.length;

      if (!len) {
   	 constantFolding(net);
      } else if (len == 1) {
   	 removeBuffer(net);
      }
   }
}

function compile(machine, ast_node) {
   machine.nets = [];
   machine.input_signal_map = {};
   machine.output_signal_map = {};
   machine.local_signal_list = [];

   //
   // Each element of the stack is a list of signal properties,
   // corresponding to a scope opened by a let statement.
   //
   machine.cc_local_signal_stack = [];

   //
   // Elaboration and linking stage
   //
   ast_node.accept_auto(new InitVisitor(machine));
   ast_node.accept(new SignalVisitor(machine));
   ast_node.accept(new TrapVisitor());
   compute_register_id(ast_node);

   //
   // Circuit translation stage
   //
   compute_depth(ast_node, 1, false, false);
   ast_node.make_circuit();
   machine.cc_local_signal_stack = null;
   machine.nets.forEach(net => net.reset(true));
   machine.boot_reg.value = true;
   if (machine.sweep) {
      sweep(machine);
   }
}

exports.compile = compile
