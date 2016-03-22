"use strict"
"use hopscript"

const ast = require("./ast.js");
const error = require("./error.js");
const net = require("./net.js");
const signal = require("./signal.js");
const lang = require("./lang.js");

/* Interface definition of a circuit. It also contains methods to get
   embeded RES, SUSP and KILL wires */

function Interface(ast_node, type, go_list, res, susp, kill_list, sel,
		   k_matrix) {
   this.ast_node = ast_node;
   this.type = type;

   if (!(go_list instanceof Array))
      throw new error.InternalError("`go_list` must be an array.",
				    ast_node.loc);
   this.go_list = go_list;

   if (kill_list && !(kill_list instanceof Array))
      throw new error.InternalError("`kill_list` must be an array.",
				    ast_node.loc);
   this.kill_list = kill_list;

   if (!(k_matrix instanceof Array))
      throw new error.InternalError("`k_matrix must be a matrix.",
				    ast_node.loc);

   for (let i in k_matrix)
      if (!(k_matrix[i] instanceof Array))
	 throw new error.InternalError("Each completion code of `k_matrix` " +
				       "must be an array.", ast_node.loc);
   this.k_matrix = k_matrix;

   this.res = res;
   this.susp = susp;
   this.sel = sel;
}

/* Functions thats builds expression test / count tests */

ast.ExpressionNode.prototype.make_expression = function(node,
							start_nets,
							true_nets,
							false_nets,
							level) {
   let test_expr = null;
   let i;

   if (this.func || this.args_list.length > 0) {
      test_expr = new net.TestExpressionNet(this, node, "testexpr", level,
					    this.func, this.args_list);
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
   if (this.func_count || this.args_list_count.length > 0) {
      let i;
      let counter = 0;
      let decr_counter_func = function() {
	 if (counter > 0)
	    counter--;
	 return counter == 0;
      }

      let decr_net = new net.TestExpressionNet(this, type, "decr_counter",
					       -1, decr_counter_func, []);

      /* put `func_count` and `loc` to make a closure in `init_counter_func` */
      let func_count = this.func_count;
      let loc = this.loc;

      let init_counter_func = function(args) {
	 let init_val;

	 if (func_count)
	    init_val = func_count.apply(null, args);
	 else
	    init_val = args;

	 if (init_val < 1)
	    error.RuntimeError("Assert counter expression > 0 failed.",
			       this.loc);
	 counter = init_val;
      }

      let init_net = new net.ActionNet(this, type, "init_counter", -1,
				       init_counter_func, this.args_list_count);
      let init_or = net.make_or(this, type, "init_or");

      for (i in start_nets)
	 start_nets[i].connect_to(decr_net, net.FAN.STD);
      init_or.connect_to(init_net, net.FAN.STD);
      for (i in reset_nets)
	 reset_nets[i].connect_to(init_or, net.FAN.STD);
      for (i in true_nets)
	 decr_net.connect_to(true_nets[i], net.FAN.STD);
      for (i in false_nets)
	 decr_net.connect_to(false_nets[i], net.FAN.NEG);
   }
}

/* Circuit translation functions */

ast.ASTNode.prototype.make_circuit = function() {
   throw new error.InternalError("`make_circuit` must be implemented",
				 this.loc)
}

ast.Parallel.prototype.make_circuit = function() {
   let children_interface = [];

   for (let i in this.children) {
      this.children[i].make_circuit();
      children_interface[i] = this.children[i].cinterface;
   }

   this.cinterface = make_parallel(this, children_interface);
}

function make_parallel(ast_node, children_interface) {
   let go_list = [];
   let res = null;
   let susp = null;
   let kill_list = null;
   let sel = null;
   let k_matrix = [];

   /* Broadcast GO */
   for (let l = 0; l <= ast_node.depth; l++) {
      for (let c in children_interface) {
	 let child_go = children_interface[c].go_list[l];

	 if (child_go) {
	    if (!go_list[l])
	       go_list[l] = net.make_or(ast_node, ast.Parallel, "go", l);
	    go_list[l].connect_to(child_go, net.FAN.STD);
	 }
      }
   }

   /* Broadcast RES, SUSP, KILL */
   res = get_res_children(ast_node, ast.Parallel, children_interface);
   susp = get_susp_children(ast_node, ast.Parallel, children_interface);
   kill_list = get_kill_list_children(ast_node, ast.Parallel,
				      children_interface);

   /* Union on SEL */
   for (let c in children_interface) {
      let child_sel = children_interface[c].sel;

      if (child_sel) {
	 if (!sel)
	    sel = net.make_or(ast_node, ast.Parallel, "sel");
	 child_sel.connect_to(sel, net.FAN.STD);
      }
   }

   /* --------------------- Synchronizer --------------------- */

   /* union is a matrix which is indexed by return code and then by
      incarnation level */
   let union = [];

   /* min is a 3D array which is indexed by children, by return code and
      then by incarnation level */
   let min = [];

   /* max completion code of the parallel + 1 */
   let max = 0;

   for (let c in children_interface)
      if (children_interface[c].k_matrix.length > max)
	 max = children_interface[c].k_matrix.length;

   /* Union K of children */
   for (let k = 0; k < max; k++) {
      union[k] = [];

      for (let l = 0; l <= ast_node.depth; l++) {
	 union[k][l] = net.make_or(ast_node, ast.Parallel, "union_k" + k, l)

	 for (let c in children_interface) {
	    let k_list = children_interface[c].k_matrix[k]

	    if (k_list && k_list[l])
	       k_list[l].connect_to(union[k][l], net.FAN.STD)
	 }
      }
   }

   /* Connect EXIT to KILL */
   if (kill_list)
      for (let k = 2; k < union.length; k++)
	 for (let l in union[k]) {
	    if (!kill_list[l])
	       kill_list[l] = net.make_or(ast_node, ast.Parallel, "pkill", l);
	    union[k][l].connect_to(kill_list[l], net.FAN.STD);
	 }

   /* Min of children */
   for (let c in children_interface) {
      let child_interface = children_interface[c];
      let child_k_matrix = child_interface.k_matrix;
      let child_min_matrix = [];

      min[c] = child_min_matrix;
      child_min_matrix[0] = [];

      /* connect all incarnation of K0 of child */
      for (let l = 0; l <= ast_node.depth; l++) {
	 child_min_matrix[0][l] = net.make_or(ast_node, ast.Parallel,
					      "or_min_k0" + "_child" + c, l);
	 if (child_k_matrix[0] && child_k_matrix[0][l])
	    child_k_matrix[0][l].connect_to(child_min_matrix[0][l],
					    net.FAN.STD);
      }

      /* connect OR-NOT door with GO of parallel and SEL of child */
      let sel_not = net.make_or(ast_node, ast.Parallel, "sel_not_child" + c);

      go_list[ast_node.depth].connect_to(sel_not, net.FAN.STD);
      if (child_interface.sel)
	 child_interface.sel.connect_to(sel_not, net.FAN.STD);
      sel_not.connect_to(child_min_matrix[0][ast_node.depth], net.FAN.NEG)

      /* connect all incarnation of child min Kn-1 to child min Kn */
      for (let k = 1; k < max; k++) {
	 child_min_matrix[k] = [];

	 for (let l = 0; l <= ast_node.depth; l++) {
	    child_min_matrix[k][l] = net.make_or(ast_node, ast.Parallel,
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

   /* Build K output doors and connect union to them */
   for (let k in union) {
      k_matrix[k] = [];
      for (let l in union[k]) {
	 k_matrix[k][l] = net.make_and(ast_node, ast.Parallel, "and_k" + k, l);
	 union[k][l].connect_to(k_matrix[k][l], net.FAN.STD);
      }
   }

   /* Connect min to K output doors */
   for (let c in min)
      for (let k in min[c])
	 for (let l in min[c][k])
	    min[c][k][l].connect_to(k_matrix[k][l], net.FAN.STD);

   return new Interface(ast_node, ast.Parallel, go_list, res, susp,
    			kill_list, sel, k_matrix);
   // return make_shift(ast_node,
   // 		     new Interface(ast_node, ast.Parallel, go_list, res, susp,
   // 				   kill_list, sel, k_matrix));
}

ast.Trap.prototype.make_circuit = function() {
   this.children[0].make_circuit();
   this.cinterface = make_shift(this, this.children[0].cinterface);
}

function make_shift(ast_node, child_interface) {
   if (child_interface.k_matrix.length <= 2)
      return child_interface;

   let k0_list = [];
   let k_matrix_child = child_interface.k_matrix;
   let k_matrix = [k0_list];
   let k0_list_child = get_k_list_child(ast_node, ast.Trap, child_interface, 0);
   let trap_gate_list = get_k_list_child(ast_node, ast.Trap,
					 child_interface, 2);

   /* Get K0 of child, and connect it to K0 output door */
   for (let l in k0_list_child) {
      k0_list[l] = net.make_or(ast_node, ast.Trap, "or_k0", l);
      k0_list_child[l].connect_to(k0_list[l], net.FAN.STD);
   }

   /* Get K2 of child, and connect it to K0 output door */
   for (let l in trap_gate_list) {
      if (!k0_list[l])
	  k0_list[l] = net.make_or(ast_node, ast.Trap, "or_k0", l);
      trap_gate_list[l].connect_to(k0_list[l], net.FAN.STD);
   }

   /* Propagate K1 of child and Shift K > 2 */
   k_matrix[1] = get_k_list_child(ast_node, ast.Trap, child_interface, 1);
   for (let k = 3; k < k_matrix_child.length; k++)
      k_matrix[k - 1] = get_k_list_child(ast_node, ast.Trap,
					 child_interface, k);

   return new Interface(ast_node, ast.Trap,
			child_interface.go_list,
			child_interface.res,
			child_interface.susp,
			child_interface.kill_list,
			child_interface.sel,
			k_matrix);
}

ast.Exit.prototype.make_circuit = function() {
   this.cinterface = make_exit(this);
}

function make_exit(ast_node) {
   let go_list = [];
   let k_matrix = [];

   for (let i = 0; i <= ast_node.return_code; i++)
      k_matrix[i] = [];

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
}

function make_sequence(ast_node, children_interface) {
   let len = children_interface.length;
   let sel = null;
   let k_matrix = [[]];
   let i = 0;

   for (i = 0; i < len; i++) {
      let child_interface = children_interface[i];

      /* connect each KO incarnation of child[N] to each GO incarnation
	 of child[N + 1] */
      if (i + 1 < len) {
	 let next_depth = children_interface[i + 1].ast_node.depth;
	 let next_go_list = children_interface[i + 1].go_list;

	 for (let l = 0; l <= child_interface.ast_node.depth; l++) {
	    /* needed for statement that have K0 only on depth, ex. pause */
	    if (!child_interface.k_matrix[0][l])
	       continue;
	    let next_l = l;

	    if (l > next_depth)
	       next_l = next_depth;
	    child_interface.k_matrix[0][l].connect_to(next_go_list[next_l],
						      net.FAN.STD);
	 }
      }

      /* connect SEL if needed */
      if (child_interface.sel) {
	 if (!sel)
	    sel = net.make_or(ast_node, ast.Sequence, "sel");
	 child_interface.sel.connect_to(sel, net.FAN.STD);
      }

      /* connects Kn where n > 0 */
      for (let j = 1; j < child_interface.k_matrix.length; j++) {
	 let child_retcode_list = child_interface.k_matrix[j];
	 let seq_retcode_list = k_matrix[j];

	 if (!seq_retcode_list)
	    k_matrix[j] = seq_retcode_list = [];

	 if (child_retcode_list.length == 0)
	    continue;

	 /* TODO: avoid to create buffer if there is subcircuit that connect
	    on it */
	 for (let l = 0; l <= ast_node.depth; l++) {
	    if (!seq_retcode_list[l])
	       seq_retcode_list[l] = net.make_or(ast_node, ast.Sequence,
						 "k" + j, l);
	    if (child_retcode_list[l])
	       child_retcode_list[l].connect_to(seq_retcode_list[l],
						net.FAN.STD);
	 }
      }
   }

   /* get K0 of last child */
   k_matrix[0] = get_k_list_child(ast_node, ast.Sequence,
				  children_interface[len - 1], 0)

   /* get RES of children */
   let res = get_res_children(ast_node, ast.Sequence, children_interface);

   /* get SUSP of children */
   let susp = get_susp_children(ast_node, ast.Sequence, children_interface);

   /* get KILL list of children */
   let kill_list = get_kill_list_children(ast_node, ast.Sequence,
					  children_interface);

   return new Interface(ast_node, ast.Sequence,children_interface[0].go_list,
			res, susp, kill_list, sel, k_matrix);
}

ast.Pause.prototype.make_circuit = function() {
   this.cinterface = make_pause(this);
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
   kill_list[ast_node.depth] = net.make_or(ast_node, ast.Pause, "kill_depth");
   kill_list[ast_node.depth].connect_to(and_to_reg, net.FAN.NEG);

   for (let i = 0; i <= ast_node.depth; i++) {
      let go = net.make_or(ast_node, ast.Pause, "go", i);
      let and = net.make_and(ast_node, ast.Pause, "and", i);

      if (i != ast_node.depth) {
	 let kill = net.make_or(ast_node, ast.Pause, "kill", i);

	 kill.connect_to(and, net.FAN.NEG);
	 kill_list[i] = kill;
      } else {
	 /* useless connection? value is anyway propagated directly via
	    and_to_reg */
	 kill_list[i].connect_to(and, net.FAN.NEG);
      }

      go.connect_to(and, net.FAN.STD);
      and.connect_to(or_to_reg, net.FAN.STD);

      go_list[i] = go;
      k_matrix[1][i] = go;
   }

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
}

ast.LoopEach.prototype.make_circuit = function() {
   this.children[0].make_circuit();
   this.cinterface = make_loopeach(this, this.children[0].cinterface);
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

   /* Error on instantaneous loop, and connect K0[depth2] on K0[depth1] */
   for (let l = 0; l <= depth2; l++)
      if (child_interface.k_matrix[0][l] && (depth2 == 0 || l < depth2))
	 child_interface.k_matrix[0][l].connect_to(
	    new net.ActionNet(ast_node, ast.Loop, "error", l,
			      function(lvl, loc) {
				 throw new error.RuntimeError(
				    "Instantaneous loop on incarnation " +
				       lvl + ".", loc)
			      }, [l, ast_node.loc]),
	    net.FAN.STD);

   if (child_interface.k_matrix[0][depth2])
      child_interface.k_matrix[0][depth2].connect_to(go_list[depth1],
						     net.FAN.STD);

   for (let k = 1; k < child_interface.k_matrix.length; k++)
      k_matrix[k] = get_k_list_child(ast_node, ast.Loop, child_interface, k);

   return new Interface(ast_node, ast.Loop, go_list, child_interface.res,
			child_interface.susp, child_interface.kill_list,
			child_interface.sel, k_matrix);
}

ast.Nothing.prototype.make_circuit = function() {
   this.cinterface = make_nothing(this);
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
				     this.args_list);

      go.connect_to(action, net.FAN.STD);
      go_list[i] = go;

   }

   this.cinterface = new Interface(this, ast.Atom, go_list, null, null, null,
				   null, k_matrix);
}

ast.Suspend.prototype.make_circuit = function() {
   this.children[0].make_circuit();
   if (this.immediate)
      throw new error.InternalError("NYI - immediate suspend", this.loc);
   else
      this.cinterface = make_suspend(this, this.children[0].cinterface);
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

   if (child_interface.res)
      and2.connect_to(child_interface.res, net.FAN.STD);

   if (child_interface.susp)
      or1.connect_to(child_interface.susp, net.FAN.STD);

   ast_node.make_expression(ast.Suspend, [and1], [and3], [and2],
			    ast_node.depth);

   k_matrix[0] = get_k_list_child(ast_node, ast.Suspend, child_interface, 0);
   k_matrix[1] = [];
   k_matrix[1][ast_node.depth] = or2;
   for (let k = 2; k < child_interface.k_matrix.length; k++)
      k_matrix[k] = get_k_list_child(ast_node, ast.Suspend, child_interface, k);

   return new Interface(ast_node, ast.Suspend, child_interface.go_list,
			and1, or1, child_interface.kill_list,
			child_interface.sel, k_matrix);
}

ast.WeakAbort.prototype.make_circuit = function() {
   this.children[0].make_circuit();

   /* needed by make_exit */
   this.return_code = 2;

   let child_interface = this.children[0].cinterface;
   let exit_branch = make_sequence(this, [make_await(this),
					  make_exit(this)]);
   let par = make_parallel(this, [exit_branch, child_interface]);

   this.cinterface = make_shift(this, par);
}

ast.Abort.prototype.make_circuit = function() {
   this.children[0].make_circuit();
   this.cinterface = make_abort(this, this.children[0].cinterface);
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

   /* If a counter must be created, AND and AND-not gates must be connected
      only on the counter output (and not on expr test) */
   if (ast_node.func_count || ast_node.args_list_count.length > 0) {
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

   /* connect SEL of subcircuit */
   if (child_interface.sel)
      child_interface.sel.connect_to(and1, net.FAN.STD);

   /* connect to RES of subcircuit */
   if (child_interface.res)
      and2.connect_to(child_interface.res, net.FAN.STD);

   /* connect K0 on depth */
   let k0 = child_interface.k_matrix[0][child_interface.ast_node.depth]
   if (k0)
      k0.connect_to(or, net.FAN.STD);
   k_matrix[0][ast_node.depth] = or;

   /* connect K0 on surface and Kn */
   for (let l = 0; l < ast_node.depth; l++)
      k_matrix[0][l] = child_interface.k_matrix[0][l];

   for (let k = 1; k < child_interface.k_matrix.length; k++)
      k_matrix[k] = get_k_list_child(ast_node, ast.Abort, child_interface, k);

   return new Interface(ast_node, ast.Abort, go_list, and1,
			child_interface.susp, child_interface.kill_list,
			child_interface.sel, k_matrix);
}

ast.Emit.prototype.make_circuit = function() {
   this.cinterface = make_emit(this);
}

function make_emit(ast_node) {
   let go_list = [];
   let k_matrix = [go_list];

   for (let i = 0; i <= ast_node.depth; i++) {
      let go = net.make_or(ast_node, ast.Emit, ast_node.signal_name + "_go", i);
      let sig_gate = get_signal_gate(ast_node.machine, ast_node.signal_name, i);

      go.connect_to(sig_gate, net.FAN.STD);
      go_list[i] = go;

      if (ast_node.func || ast_node.args_list.length > 0)
	 go.connect_to(new net.SignalExpressionNet(ast_node, ast.Emit,
						   ast_node.signal_name +
						   "_signal_expr", i),
		       net.FAN.STD);
   }

   return new Interface(ast_node, ast.Emit, go_list, null, null, null,
			null, k_matrix);
}

ast.Sustain.prototype.make_circuit = function() {
   this.cinterface = make_loop(this, make_sequence(this,
						   [make_emit(this),
						    make_pause(this)]));
}

ast.If.prototype.make_circuit = function() {
   this.children[0].make_circuit();
   this.children[1].make_circuit();
   this.cinterface = make_if(this, [this.children[0].cinterface,
				    this.children[1].cinterface]);
}

function make_if(ast_node, children_interface) {
   let go_list = [];
   let sel = null;
   let k_matrix = [[]];

   function connect_k(ast_node, km, lvl) {
      for (let i in km) {
	 if (!k_matrix[i])
	    k_matrix[i] = [];
	 if (!k_matrix[i][lvl])
	    k_matrix[i][lvl] = net.make_or(ast_node, ast.If, "k" + i, lvl);
	 if (km[i][lvl])
	    km[i][lvl].connect_to(k_matrix[i][lvl], net.FAN.STD);
      }
   }

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

      connect_k(ast_node, children_interface[0].k_matrix, i);
      connect_k(ast_node, children_interface[1].k_matrix, i);
      go_list[i] = go;
   }

   for (let i in children_interface)
      if (children_interface[i].sel) {
	 if (!sel)
	    sel = net.make_or(ast_node, ast.If, "sel");
	 children_interface[i].sel.connect_to(sel, net.FAN.STD);
      }

   /* get RES of children */
   let res = get_res_children(ast_node, ast.If, children_interface);

   /* get SUSP of children */
   let susp = get_susp_children(ast_node, ast.If, children_interface);

   /* get KILL list of children */
   let kill_list = get_kill_list_children(ast_node, ast.If, children_interface);

   return new Interface(ast_node, ast.If, go_list, res, susp, kill_list, sel,
			k_matrix);
}

ast.Halt.prototype.make_circuit = function() {
   this.cinterface = make_halt(this);
}

function make_halt(ast_node) {
   return make_loop(ast_node, make_pause(ast_node));
}

ast.Run.prototype.make_circuit = function() {
   this.children[0].make_circuit();
   this.cinterface = this.children[0].cinterface;
}

ast.LocalSignal.prototype.make_circuit = function() {
   let sig = ast.Signal.prototype.make_circuit.call(this, ast.LocalSignal);
   let go_list = [];
   let child = this.children[0];
   let dep_pre = null;

   this.machine.local_signal_map[this.signal_name] = sig;
   child.make_circuit();

   /* We needs a go for local signal in order to be able to know when a
      local sigal is conecptually instantiated, and reset it, if it is valued */
   for (let l = 0; l <= this.depth; l++) {
      let go = net.make_or(this, ast.LocalSignal, "go", l);

      go_list[l] = go;
      go.connect_to(child.cinterface.go_list[l], net.FAN.STD);

      if (sig instanceof signal.ValuedSignal) {
	 let action = new net.ActionNet(this, ast.LocalSignal, "reset", l,
					function() {sig.reset(true)}, []);
	 go.connect_to(action, net.FAN.STD);
      }

      /* The gate must await that local signal is REincarned before propagate */
      if (l > 1) {
	 if (!dep_pre) {
	    dep_pre = net.make_or(this, ast.LocalSignal,
				  this.name + "_dep_pre");
	       dep_pre.connect_to(sig.pre_gate, net.FAN.STD);
	 }
	 go_list[l].connect_to(dep_pre, net.FAN.STD);
      }
   }

   this.cinterface = new Interface(this, ast.LocalSignal, go_list,
				   child.cinterface.res,
				   child.cinterface.susp,
				   child.cinterface.kill_list,
				   child.cinterface.sel,
				   child.cinterface.k_matrix);
}

ast.InputSignal.prototype.make_circuit = function() {
   let sig = ast.Signal.prototype.make_circuit.call(this, ast.InputSignal);

   this.machine.input_signal_map[this.signal_name] = sig;
}

ast.OutputSignal.prototype.make_circuit = function() {
   let sig = ast.Signal.prototype.make_circuit.call(this, ast.OutputSignal);

   this.machine.output_signal_map[this.signal_name] = sig;
}

ast.Signal.prototype.make_circuit = function(type) {
   if (this.valued)
      return new signal.ValuedSignal(this, type);
   else
      return new signal.Signal(this, type);
}

ast.Module.prototype.make_circuit = function() {
   let boot_reg = new net.RegisterNet(this, ast.Module, "global_boot_register");
   let const0 = net.make_or(this, ast.Module, "global_const0");

   /* It's mandatory that `boot_reg` propagate BEFORE `const0` the
      first reaction. It's OK with current known list, but keep that
      in mind. (we also count make a dependency of `boot_reg` to `const0`?) */
   const0.connect_to(boot_reg, net.FAN.STD);
   this.machine.boot_reg = boot_reg;

   /* translation of program */
   let i = null;
   for (i in this.children) {
      this.children[i].make_circuit();
   }

   /* last children is the reactive program code */
   let child = this.children[i];
   let list = null;

   /* connect global boot register and res of circuit */
   boot_reg.connect_to(child.cinterface.go_list[0], net.FAN.STD);
   if (child.cinterface.res)
      boot_reg.connect_to(child.cinterface.res, net.FAN.NEG);

   /* connect kill (level 0) of circuit */
   if (child.cinterface.kill && child.cinterface.kill[0])
      const0.connect_to(child.cinterface.kill[i], net.FAN.STD);

   /* connect susp of circuit */
   if (child.cinterface.susp)
      const0.connect_to(child.cinterface.susp, net.FAN.STD);

   /* connect sel, K0 (level 0) and K1 (level 0) */
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
}

/* Helper function that gives a list of incarnation of K[n] level of a
   substatement, taking account a possible decrementation of incarnation */
function get_k_list_child(ast_node, type, child_interface, k) {
   let depth1 = ast_node.depth;
   let depth2 = child_interface.ast_node.depth;
   let k_list1 = [];
   let k_list2 = child_interface.k_matrix[k];

   if (!k_list2)
      return k_list1;

   for (let l in k_list2)
      if (l <= depth1) {
   	 k_list1[l] = net.make_or(ast_node, type, "k" + k + "_buffer", l);
   	 if (k_list2[l])
   	    k_list2[l].connect_to(k_list1[l], net.FAN.STD);
      } else {
   	 k_list2[l].connect_to(k_list1[depth1], net.FAN.STD);
      }

   return k_list1;
}

/* Helper function that gives net buffer connected to RES wires of
   children */
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

/* Helper function that gives SUSP net buffer connected to SUSP wires of
   children */
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

/* Helper function that gives KILL net list buffer connected to KILL list
   wires of children */
function get_kill_list_children(ast_node, type, children_interface) {
   let kill_list = null;

   for (let l = 0; l <= ast_node.depth; l++)
      for (let c in children_interface) {
	 let child = children_interface[c];
	 let depth = child.ast_node.depth;
	 let kill = child.kill_list ? child.kill_list[l] : undefined;

	 if (kill) {
	    if (!kill_list)
	       kill_list = [];
	    if (!kill_list[l])
	       kill_list[l] = net.make_or(ast_node, type, "buffer_kill", l);
	    kill_list[l].connect_to(kill, net.FAN.STD);
	 }
      }

   return kill_list;
}

/* Helper function that gives a signal gate at a specific incarnation level */

function get_signal_gate(machine, signal_name, lvl) {
   let gate_list = get_signal_object(machine, signal_name).gate_list;

   if (gate_list.length <= lvl)
      return gate_list[gate_list.length - 1];
   return gate_list[lvl];
}

exports.get_signal_gate = get_signal_gate;

/* Helper function that gives a signal at a specific incarnation level */

function get_signal_pre_gate(machine, signal_name) {
   return get_signal_object(machine, signal_name).pre_gate;
}

exports.get_signal_pre_gate = get_signal_pre_gate;

/* Helper function that gives a signal object */

function get_signal_object(machine, signal_name) {
   return (machine.input_signal_map[signal_name] ||
	   machine.output_signal_map[signal_name] ||
	   machine.local_signal_map[signal_name]);
}

exports.get_signal_object = get_signal_object;

/* Visitors and functions thats decorates the AST before circuit translation */

function RenameLocalSignalVisitor(machine) {
   this.next_id = 0;
   this.map_old_to_new = {};
   this.machine = machine;
}

RenameLocalSignalVisitor.prototype.visit = function(ast_node) {
   function switch_name(self, obj) {
      /* obj can be type of astnode or signal accessor, but it dosen't matter
	 since the name filed has the same name (signal_name) */

      let name = obj.signal_name;
      let mapped_name = self.map_old_to_new[name];

      if (mapped_name)
	 obj.signal_name = mapped_name;
   }

   if (ast_node instanceof ast.LocalSignal) {
      let old_name = ast_node.signal_name;
      let new_name;

      /* If LocalSignal already remaned on previous compilation */
      if (ast_node.signal_name == ast_node.renamed_from) {
	 new_name = ast_node.signal_name;
      } else {
	 new_name = old_name + "___LOCAL_" + this.machine.local_signal_next_id;
	 ast_node.signal_name = new_name;
      }
      this.map_old_to_new[old_name] = new_name;
      this.machine.local_signal_next_id++;
   } else {
      if (ast_node.signal_name)
	 switch_name(this, ast_node);

      if (ast_node.args_list)
	 for (let i in ast_node.args_list) {
	    let arg = ast_node.args_list[i];

	    if (arg instanceof lang.SignalAccessor)
	       switch_name(this, arg);
	 }
   }
}

function SetMachineVisitor(machine) {
   this.machine = machine;
}

SetMachineVisitor.prototype.visit = function(ast_node) {
   ast_node.machine = this.machine;
}

function CheckSignalTypeVisitor() {
   this.typed_map = {};
}

CheckSignalTypeVisitor.prototype.visit = function(ast_node) {
   if (ast_node instanceof ast.Signal)
      this.typed_map[ast_node.signal_name] = ast_node.valued;
   else if (ast_node instanceof ast.Emit &&
	    (ast_node.args_list.length > 0 || ast_node.func) &&
	    !this.typed_map[ast_node.signal_name])
      throw new error.SignalError("Pure signal, can't set value of it",
				  ast_node.signal_name, ast_node.loc);
   else if (ast_node.args_list)
      for (let i in ast_node.args_list) {
	 let arg = ast_node.args_list[i];

	 if (arg instanceof lang.SignalAccessor &&
	     arg.get_value &&
	     !this.typed_map[arg.signal_name])
	    throw new error.SignalError("Pure signal, can't get value of it",
					arg.signal_name, ast_node.loc);
      }
}

function CheckNameVisitor() {
   this.trap_names = [];
   this.signal_names = [];
   this.local_stack = [];
}

CheckNameVisitor.prototype.visit = function(ast_node) {
   let instanceof_local_signal = ast_node instanceof ast.LocalSignal;
   let name = ast_node.signal_name || ast_node.trap_name;

   if (instanceof_local_signal) {
      if (this.signal_names.indexOf(name) > -1)
	 throw new error.SyntaxError("Local signal name `" + name +
				     "` already used", ast_node.loc)
      if (this.local_stack[name])
	 throw new error.SyntaxError("Local signal name embedded in another" +
				     " local signal declaration with same " +
				     "name `" + name + "`", ast_node.loc);
      this.local_stack.push(name);
   } else if (ast_node instanceof ast.Signal) {
      /* this case happens only for Input and Output Signal */

      if (this.signal_names.indexOf(name) > -1 ||
	  this.local_stack.indexOf(name) > -1)
	 throw new error.SyntaxError("Signal name `" + name +
				     "` already used", ast_node.loc)
      this.signal_names.push(name);
   } else if (ast_node instanceof ast.Trap) {
      if (this.trap_names.indexOf(name) > -1)
	 throw new error.SyntaxError("Trap name `" + name + "` already used",
				     ast_node.loc)
      this.trap_names.push(name);
   } else if (ast_node.signal_name) {
      if (this.signal_names.indexOf(name) == -1 &&
	  this.local_stack.indexOf(name) == -1)
	 throw new error.SyntaxError("Unknown signal identifier `"
				     + name + "`", ast_node.loc)
   } else if (ast_node instanceof ast.Exit) {
      if (this.trap_names.indexOf(name) == -1)
	 throw new error.SyntaxError("Unknown trap identifier `"
				     + name + "`", ast_node.loc);
   }

   for (let i in ast_node.children)
      ast_node.children[i].accept(this);

   if (instanceof_local_signal)
      this.local_stack.pop();
}

function ComputeTraplevelVisitor() {
   this.trap_stack = [];
}

ComputeTraplevelVisitor.prototype.visit = function(ast_node) {
   var ast_node_instanceof_trap = ast_node instanceof ast.Trap;

   if (ast_node_instanceof_trap) {
      this.trap_stack.push(ast_node.trap_name);
   }

   for (var i in ast_node.children)
      ast_node.children[i].accept(this);

   if (ast_node_instanceof_trap) {
      this.trap_stack.pop();
   } else if (ast_node instanceof ast.Exit) {
      let offset = this.trap_stack.length
	  - this.trap_stack.indexOf(ast_node.trap_name) - 1;
      ast_node.return_code += offset;
   }
}

function compute_depth(ast_node, depth, in_loop, in_par_sig) {
   if (ast_node instanceof ast.Loop || ast_node instanceof ast.LoopEach) {
      in_loop = true;
      in_par_sig = false;
   } else if (ast_node instanceof ast.Parallel ||
	      ast_node instanceof ast.LocalSignal) {
      in_par_sig = true;
      if (in_loop) {
	 depth++;
	 in_loop = false;
      }
   }

   if (ast_node instanceof ast.Module ||
       ast_node instanceof ast.InputSignal ||
       ast_node instanceof ast.OutputSignal)
      ast_node.depth = 0;
   else
      ast_node.depth = depth;
   for (let i in ast_node.children)
      compute_depth(ast_node.children[i], depth, in_loop, in_par_sig);
}

function compile(machine, ast_node) {
   /* Elaboration and linking stage */
   ast_node.accept_auto(new SetMachineVisitor(machine));
   ast_node.accept(new CheckNameVisitor());
   ast_node.accept_auto(new CheckSignalTypeVisitor());
   ast_node.accept_auto(new RenameLocalSignalVisitor(machine));
   ast_node.accept(new ComputeTraplevelVisitor());

   /* Circuuit translation stage */
   compute_depth(ast_node, 1, false, false);
   //console.log(ast_node.pretty_print());
   ast_node.make_circuit();
}

exports.compile = compile
