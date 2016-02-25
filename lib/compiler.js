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

ast.CountExpressionNode.prototype.make_counter = function(node,
							  start_nets,
							  reset_nets,
							  true_nets,
							  false_nets,
							  level) {
   if (this.func_count || this.args_list_count.length > 0) {
      let i;
      let counter = 0;
      let decr_counter_func = function() {
	 if (counter > 0)
	    counter--;
	 return counter == 0;
      }

      let decr_net = new net.TestExpressionNet(this, node, "decr_counter",
					       level, decr_counter_func, []);

      /* put `func_count` and `loc` to make a closure in `init_counter_func` */
      let func_count = this.func_count;
      let loc = this.loc;

      let init_counter_func = function(args) {
	 let init_val;

	 if (func_count)
	    init_val = func_count.apply(null, args);
	 else
	    init_val = args[0];

	 if (init_val < 1)
	    error.RuntimeError("Assert counter expression > 0 failed.",
			       this.loc);
      }

      let init_net = new net.ActionNet(this, node, "init_counter", level,
				       init_counter_func, this.args_list_count);

      for (i in start_nets)
	 start_nets[i].connect_to(decr_net, net.FAN.STD);
      for (i in reset_nets)
	 reset_nets[i].connect_to(init_net, net.FAN.STD);
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
   let union = [];
   let min = [];

   /* Broadcast GO, RES, SUSP and KILL */
   for (let i = 0; i <= this.depth; i++)
      for (let j in children_interface) {
	 let go = children_interface[j].go_list[i];
	 let kill = children_interface[j].kill_list ?
	     children_interface[j].kill_list[i] :
	     undefined;

	 if (go) {
	    if (!go_list[i])
	       go_list[i] = net.make_or(ast_node, ast.Parallel, "go", i);
	    go_list[i].connect_to(go, net.FAN.STD);
	 }

	 if (kill) {
	    if (!kill_list[i])
	       kill_list[i] = net.make_or(ast_node, ast.Parallel, "kill", i);
	    kill_list[i].connect_to(kill, net.FAN.STD);
	 }
      }

   /* Union on SEL */
   for (let i in children_interface) {
      let child_sel = children_interface[i].sel;
      if (child_sel) {
	 if (!sel)
	    sel = net.make_or(ast_node, ast.Parallel, "sel");
	 sel.connect_to(child_sel, net.FAN.STD);
      }
   }

   /* Synchronizer */
   for (let i in children_interface) {
      let child = children_interface[i];

      /* Union of K[k, lvl] or each child */
      for (let j in child.k_matrix) {
	 let k_lvl = child.k_matrix[j];

	 if (k_lvl) {
	    if (!union[j])
	       union[j] = [];
	    for (let l in k_lvl) {
	       if (!union[j][l])
		  union[j][l] = net.make_or(ast_node, ast.Parallel,
					    "union_k" + j, l);
	       k_lvl[l].connect_to(union[j][l]);
	    }
	 }
      }

      /* Min of each child */
      let min_child = [];

      min[i] = min_child;
      for (let k in child.k_matrix) {
	 let k_lvl = child.k_matrix[k];

	 min_child[k] = [];
	 for (let l = 0; l < k_lvl.length; l++) {
	    min_child[k][l] = net.make_or(ast_node, ast.Parallel, "min_" + i +
					  "_" + k, l)
	    k_lvl[l].connect_to(min_child[k][l], net.FAN.STD);

	    if (l -1 >= 0)
	       k_lvl[l - 1].connect_to(min_child[k][l], net.FAN.STD);
	 }

	 let or = net.make_or(ast_node ast.Parallel, "or_sel_go_" + i);

	 if (child.sel)
	    child.sel.connect_to(or, net.FAN.STD);
	 child.go_list[ast_node.depth].connect_to(or, net.FAN.STD);
	 or.connect_to(min_child[0][ast_node.depth], net.FAN.NEG);
      }

      /* k_matrix */
      for (let k in child.k_matrix) {
	 let k_lvl = child.k_matrix[k];

	 if (!k_matrix[k])
	    k_matrix[k] = [];
	 for (let l in k_lvl) {
	    if (!k_matrix[k][l])
	       k_matrix[k][l] = net.make_or(ast_node, ast.Parallel, "k" + k, l);
	    min_child[k][l].connect_to(k_matrix[k][l], net.FAN.STD)
	 }
      }
   }

   /* connect union to k_matrix */
   for (let k in union)
      for (let l in union[k])
	 union[k][l].connect_to(k_matrix[k][l], net.FAN.STD);

   return new Interface(ast_node, ast.Parallel, go_list, res, susp, kill_list,
			sel, k_matrix);
}

ast.Trap.prototype.make_circuit = function() {
   this.children[0].make_circuit();
   this.cinterface = make_trap(this, this.children[0].cinterface);
}

function make_trap(ast_node, child_interface) {
   let k0_list = [];
   let kill_list = [];
   let k_matrix_child = child_interface.k_matrix;
   let k_matrix = [k0_list, k_matrix_child[1], []];

   for (let i = 0; i <= ast_node.depth; i++) {
      k0_list[i] = net.make_or(ast_node, ast.Trap, "or_k0", i);
      kill_list[i] = net.make_or(ast_node, ast.Trap, "or_kill", i);

      if (child_interface.kill_list && child_interface.kill_list[i])
	 kill_list[i].connect_to(child_interface.kill_list[i], net.FAN.STD);

      if (k_matrix_child[0][i])
	 k_matrix_child[0][i].connect_to(k0_list[i], net.FAN.STD);

      if (k_matrix_child[2] && k_matrix_child[2][i]) {
	 let k2 = k_matrix_child[2][i];

	 k2.connect_to(k0_list[i], net.FAN.STD);
	 k2.connect_to(kill_list[i], net.FAN.STD);
      }
   }

   for (let i = 3; i < k_matrix_child.length; i++)
      k_matrix[i - 1] = k_matrix_child[i];

   return new Interface(ast_node, ast.Trap,
			child_interface.go_list,
			child_interface.res,
			child_interface.susp,
			kill_list,
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
	 let next_child_interface = children_interface[i + 1];
	 let j = 0;

	 /* Need to check that child_interface.k_matrix[0][j] exists
	    because of pause that return 0 only on depth */
	 for (j in child_interface.k_matrix[0])
	    if (next_child_interface.go_list[j] &&
		child_interface.k_matrix[0][j])
	       child_interface.k_matrix[0][j].connect_to(
		  next_child_interface.go_list[j], net.FAN.STD);
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

	 for (let l = 0; l <= ast_node.depth; l++) {
	    if (!seq_retcode_list[l])
	       seq_retcode_list[l] = net.make_or(ast_node, ast.Sequence,
						 "k" + j, l);
	    child_retcode_list[l].connect_to(seq_retcode_list[l], net.FAN.STD);
	 }
      }
   }

   for (i = 0; i <= ast_node.depth; i++)
      k_matrix[0][i] = children_interface[len - 1].k_matrix[0][i];


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
	 /* useless connection, value is anyway propagated directly via
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
					      make_halt(ast_node)])))
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

   for (let i = 0; i <= depth1; i++) {
      let or =  net.make_or(ast_node, ast.Loop, "go", i);

      or.connect_to(child_interface.go_list[i], net.FAN.STD);
      go_list[i] = or;
   }
   child_interface.k_matrix[0][depth2].connect_to(go_list[depth1],
						  net.FAN.STD);
   for (let i = 1; i < child_interface.k_matrix.length; i++)
      k_matrix[i] = child_interface.k_matrix[i];

   return new Interface(ast_node, ast.Loop, go_list, child_interface.res,
			child_interface.susp, child_interface.kill_list,
			child_interface.sel, k_matrix);
}

ast.Nothing.prototype.make_circuit = function() {
   let go_list = [];
   let k_matrix = [[]];

   for (let i = 0; i <= this.depth; i++) {
      let go = net.make_or(this, ast.Nothing, "go", i);

      go_list[i] = go;
      k_matrix[0][i] = go;
   }

   this.cinterface = new Interface(this, ast.Nothing, go_list, null, null,
				   null, null, k_matrix);
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

   k_matrix[0] = child_interface.k_matrix[0];
   k_matrix[1] = [];
   k_matrix[1][ast_node.depth] = or2;
   for (let i = 2; i < child_interface.k_matrix.length; i++)
      k_matrix[i] = child_interface.k_matrix[i];



   return new Interface(ast_node, ast.Suspend, child_interface.go_list,
			and1, or1, child_interface.kill_list,
			child_interface.sel, k_matrix);
}

ast.Abort.prototype.make_circuit = function() {
   this.children[0].make_circuit();
   if (this.immediate)
      throw new error.InternalError("NYI - immediate abort", this.loc);
   else
      this.cinterface = make_abort(this, this.children[0].cinterface);
}

/* TODO: can be simplified (see p.150, and Suspend above, expr test
   only in the depth) */

function make_abort(ast_node, child_interface) {
   let and1 = net.make_and(ast_node, ast.Abort, "and1_sel_res");
   let and2 = net.make_and(ast_node, ast.Abort, "and2_negtest_and1");
   let and3 = net.make_and(ast_node, ast.Abort, "and3_test_and1");
   let or = net.make_or(ast_node, ast.Abort, "or_and3_k0");
   let go_list = [];
   let k_matrix = [[]];

   for (let i = 0; i <= ast_node.depth; i++) {
      let test_expr = null;
      let go = net.make_or(ast_node, ast.Abort, "go", i);

      go_list[i] = go;
      go.connect_to(child_interface.go_list[i], net.FAN.STD);

      /* gate for `test_expr` expression (evaluated each tine and1=1) */
      test_expr = ast_node.make_expression(ast.Abort,
					   [and1], [and3], [and2], i);

      /* gates for initialization of count (evaluated each time GO=1),
	 and decrementation of count (each time and1=1 and test=1) */
      ast_node.make_counter(ast.Abort,
			    [test_expr, and1], [go_list[i]], [and3], [and2], i);
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
   for (let i = 0; i < ast_node.depth; i++)
      k_matrix[0][i] = child_interface.k_matrix[0][i];
   for (let i = 1; i < child_interface.k_matrix.length; i++)
      k_matrix[i] = child_interface.k_matrix[i];

   return new Interface(ast_node, ast.Abort, go_list, and1,
			child_interface.susp, child_interface.kill_list,
			child_interface.sel, k_matrix);
}

ast.Emit.prototype.make_circuit = function() {
   let go_list = [];
   let k_matrix = [go_list];

   for (let i = 0; i <= this.depth; i++) {
      let go = net.make_or(this, ast.Emit, this.signal_name + "_go", i);
      let sig_gate = get_signal_gate(this.machine, this.signal_name, i);

      go.connect_to(sig_gate, net.FAN.STD);
      go_list[i] = go;

      if (this.func || this.args_list.length > 0)
	 go.connect_to(new net.SignalExpressionNet(this, ast.Emit,
						   this.signal_name +
						   "_signal_expr", i),
		       net.FAN.STD);
   }

   this.cinterface = new Interface(this, ast.Emit, go_list, null, null, null,
				   null, k_matrix);
}

ast.If.prototype.make_circuit = function() {
   let go_list = [];
   let sel = null;
   let k_matrix = [[]];

   function connect_k(ast_node, km, lvl) {
      for (let i in km) {
	 if (!k_matrix[i])
	    k_matrix[i] = [];
	 if (!k_matrix[i][lvl])
	    k_matrix[i][lvl] = net.make_or(ast_node, ast.If, "k" + i, lvl);
	 km[i][lvl].connect_to(k_matrix[i][lvl], net.FAN.STD);
      }
   }

   this.children[0].make_circuit();
   this.children[1].make_circuit();

   for (let i = 0; i <= this.depth; i++) {
      let go = net.make_or(this, ast.If, "go", i);
      let and_then = net.make_and(this, ast.If, "and_then", i);
      let and_else = net.make_and(this, ast.If, "and_else", i);

      this.make_expression(ast.If, [go], [and_then], [and_else], i);

      go.connect_to(and_then, net.FAN.STD);
      go.connect_to(and_else, net.FAN.STD);

      and_then.connect_to(this.children[0].cinterface.go_list[i], net.FAN.STD);
      and_else.connect_to(this.children[1].cinterface.go_list[i], net.FAN.STD);

      connect_k(this, this.children[0].cinterface.k_matrix, i);
      connect_k(this, this.children[1].cinterface.k_matrix, i);
      go_list[i] = go;
   }

   for (let i in this.children)
      if (this.children[i].cinterface.sel) {
	 if (!sel)
	    sel = net.make_or(this, ast.If, "sel");
	 this.children[i].cinterface.sel.connect_to(sel, net.FAN.STD);
      }

   let children_interface = [this.children[0].cinterface,
			     this.children[1].cinterface];

   /* get RES of children */
   let res = get_res_children(this, ast.If, children_interface);

   /* get SUSP of children */
   let susp = get_susp_children(this, ast.If, children_interface);

   /* get KILL list of children */
   let kill_list = get_kill_list_children(this, ast.If, children_interface);

   this.cinterface = new Interface(this, ast.If, go_list, res, susp, kill_list,
				   sel, k_matrix);
}

ast.Halt.prototype.make_circuit = function() {
   this.cinterface = make_halt(this);
}

function make_halt(ast_node) {
   return make_loop(ast_node, make_pause(ast_node));
}

ast.LocalSignal.prototype.make_circuit = function() {
   let sig = ast.Signal.prototype.make_circuit.call(this, ast.LocalSignal);
   let go_list = [];
   let child = this.children[0];

   this.machine.local_signal_map[this.signal_name] = sig;
   child.make_circuit();

   /* We needs a go for local signal in order to be able to know when a
      local sigal is conecptually instantiated, and reset it, if it is valued */
   for (let i = 0; i <= this.depth; i++) {
      let go = net.make_or(this, ast.LocalSignal, "go", i);

      go_list[i] = go;
      go.connect_to(child.cinterface.go_list[i], net.FAN.STD);

      if (sig instanceof signal.ValuedSignal) {
	 let action = new net.ActionNet(this, ast.LocalSignal, "reset", i,
					function() {sig.reset(false)}, []);
	 go.connect_to(action, net.FAN.STD);
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

   /* Because `const0` progagates its value if `boot_reg`, it's mandatory that
      `boot_reg` propagate BEFORE `const0` the first reaction. It's OK with
      current known list, but keep that in mind */
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
   if (child.cinterface.k_matrix[0])
      this.machine.k0 = child.cinterface.k_matrix[0][0];
   if (child.cinterface.k_matrix[1])
      this.machine.k1 = child.cinterface.k_matrix[1][0];
}

/* Helper function that gives net buffer connected to RES wires of
   children */
function get_res_children(ast_node, type, children_interface) {
   let res = null;

   if (children_interface.length == 1) {
      res = children_interface[i].res;
   } else {
      res = net.make_or(ast_node, type, "buffer_res");
      for (let i in children_interface) {
	 let res_child = children_interface[i].res;

	 if (res_child)
	    res.connect_to(res_child, net.FAN.STD);
      }
   }

   return res;
}

/* Helper function that gives SUSP net buffer connected to SUSP wires of
   children */
function get_susp_children(ast_node, type, children_interface) {
   let susp = null;

   if (children_interface.length == 1) {
      susp = children_interface[i].susp;
   } else {
      susp = net.make_or(ast_node, type, "buffer_susp");
      for (let i in children_interface) {
	 let susp_child = children_interface[i].susp;

	 if (susp_child)
	    susp.connect_to(susp_child, net.FAN.STD);
      }
   }

   return susp;
}

/* Helper function that gives KILL net list buffer connected to KILL list
   wires of children */
function get_kill_list_children(ast_node, type, children_interface) {
   let kill_list = null;

   for (let i = 0; i <= ast_node.depth; i++)
      for (let j in children_interface) {
	 let child = children_interface[i];
	 let depth = child.ast_node.depth;
	 let lvl = depth < i ? depth : i;
	 let kill = child.kill_list ? child.kill_list[lvl] : undefined;

	 if (kill) {
	    if (!kill_list)
	       kill_list = [];
	    if (!kill_list[i])
	       kill_list[i] = net.make_or(ast_node, type, "buffer_kill", i);
	    kill_list[i].connect_to(kill, net.FAN.STD);
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

function RenameLocalSignalVisitor() {
   this.next_id = 0;
   this.map_old_to_new = {};
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
      let new_name = old_name + "___LOCAL_" + this.next_id;

      ast_node.signal_name = new_name;
      this.map_old_to_new[old_name] = new_name;
      this.next_id++;
   } else if (ast_node.signal_name) {
      switch_name(this, ast_node);
   } else if (ast_node.args_list) {
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
   if (ast_node instanceof ast.Loop) {
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

   ast_node.depth = depth;
   for (let i in ast_node.children)
      compute_depth(ast_node.children[i], depth, in_loop, in_par_sig);
}

function compile(machine, ast_node) {
   /* Elaboration and linking stage */
   ast_node.accept_auto(new SetMachineVisitor(machine));
   ast_node.accept(new CheckNameVisitor());
   ast_node.accept_auto(new RenameLocalSignalVisitor());
   ast_node.accept(new ComputeTraplevelVisitor());

   /* Circuuit translation stage */
   compute_depth(ast_node, 0, false, false);
   console.log(ast_node.pretty_print(0));
   ast_node.make_circuit();
}

exports.compile = compile
