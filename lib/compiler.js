"use hopscript"

const ast = require("./ast.js");
const error = require("./error.js");
const net = require("./net.js");
const signal = require("./signal.js");
const lang = require("./lang.js");

/* Interface definition of a circuit. It also contains methods to get
   embeded RES, SUSP and KILL wires */

function Interface(ast_node, go_list, res, susp, kill_list, sel, k_matrix) {
   this.ast_node = ast_node;

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

Interface.prototype.get_res_list = function() {
   let res_list = null;

   if (this.res)
      res_list = [this.res];

   for (let i in this.ast_node.children) {
      let res_child = this.ast_node.children[i].cinterface.get_res_list();

      if (res_child) {
	 if (!res_list)
	    res_list = res_child;
	 else
	    res_list = res_list.concat(res_child);
      }
   }

   return res_list;
}

Interface.prototype.get_susp_list = function() {
   let susp_list = null;

   if (this.susp)
      susp_list = [this.susp];

   for (let i in this.ast_node.children) {
      let susp_child = this.ast_node.children[i].cinterface.get_susp_list();

      if (susp_child) {
	 if (!susp_list)
	    susp_list = susp_child;
	 else
	    susp_list = susp_list.concat(susp_child);
      }
   }

   return susp_list;
}

Interface.prototype.get_kill_list = function(level) {
   /* Beware to not make confusion on the nature of this list : it is indexed
      by *children*, not by incarnation (which is given by `level`) */
   if (this.depth < level)
      return null;
   let kill_list = null;

   if (this.kill_list  && this.kill_list[level])
      kill_list = [this.kill_list[level]];

   for (let i in this.ast_node.children) {
      let kill_child = this.ast_node.children[i].cinterface.get_kill_list(level);

      if (kill_child) {
	 if (!kill_list)
	    kill_list = kill_child;
	 else
	    kill_list = kill_list.concat(kill_child)
      }
   }

   return kill_list;
}

/* Functions thats builds expression test / count tests */

ast.ExpressionNode.prototype.make_expression = function(start_nets,
							true_nets,
							false_nets,
							level) {
   let test_expr = null;
   let i;

   if (this.func || this.args_list.length > 0) {
      test_expr = new net.TestExpressionNet(this, "testexpr___" + level,
					    this.func,
					    this.args_list,
					    level);
      for (i in start_nets)
	 start_nets[i].connect_to(test_expr, net.FAN.STD);
      for (i in true_nets)
	 test_expr.connect_to(true_nets[i], net.FAN.STD);
      for (i in false_nets)
	 test_expr.connect_to(false_nets[i], net.FAN.NEG);
   }

   return test_expr;
}

ast.CountExpressionNode.prototype.make_counter = function(start_nets,
							  reset_nets,
							  true_nets,
							  false_nets,
							  level) {
   if (this.func_count || this.args_list_count.length > 0) {
      let i;
      let test_cnt = null;
      let counter = 0;
      let decr_counter_func = function() {
	 if (counter > 0)
	    counter--;
	 return counter == 0;
      }

      let decr_net = new net.TestExpressionNetNet(this,
						  "decr_counter___" + level,
						  decr_counter_func,
						  [], level);

      let init_counter_func = function(args) {
	 let init_val = this.func_count.apply(null, args);

	 if (init_val < 1)
	    error.RuntimeError("Assert counter expression > 0 failed.",
			       this.loc);
      }

      let init_net = new net.ActionNet(this, "init_counter___" + level,
				       init_counter_func,
				       this.args_list_count, level);

      for (i in start_nets)
	 start_nets[i].connect_to(decr_net, nan.FAN.STD);
      for (i in reset_nets)
	 reset_nets[i].connect_to(init_net, net.FAN.STD);
      for (i in true_nets)
	 test_cnt.connect_to(true_nets[i], net.FAN.STD);
      for (i in false_nets)
	 test_cnt.connect_to(false_nets[i], net.FAN.NEG);
   }
}

/* Circuit translation functions */

ast.ASTNode.prototype.make_circuit = function() {
   throw new error.InternalError("`make_circuit` must be implemented",
				 this.loc)
}

ast.Sequence.prototype.make_circuit = function() {
   let len = this.children.length;
   let sel = null;
   let k_matrix = [[]];
   let i = 0;

   for (i = 0; i < len; i++)
      this.children[i].make_circuit();

   for (i = 0; i < len; i++) {
      let child_interface = this.children[i].cinterface;

      /* connect each KO incarnation of child[N] to each GO incarnation
	 of child[N + 1] */
      if (i + 1 < len) {
	 let next_child_interface = this.children[i + 1].cinterface;
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
	    sel = net.make_or(this, "sel");
	 child_interface.sel.connect_to(sel, net.FAN.STD);
      }

      /* connects Kn where n > 0 */
      for (let j = 1; j < child_interface.k_matrix.length; j++) {
	 let child_retcode_list = child_interface.k_matrix[j];
	 let seq_retcode_list = k_matrix[j];

	 if (!seq_retcode_list)
	    k_matrix[j] = seq_retcode_list = [];

	 for (let l = 0; l <= this.depth; l++) {
	    if (!seq_retcode_list[l])
	       seq_retcode_list[l] = net.make_or(this, "k" + j + "___" + l);
	    child_retcode_list[l].connect_to(seq_retcode_list[l], net.FAN.STD);
	 }
      }
   }

   for (i = 0; i <= this.depth; i++)
      k_matrix[0][i] = this.children[len - 1].cinterface.k_matrix[0][i];

   this.cinterface = new Interface(this, this.children[0].cinterface.go_list,
				   null, null, null, sel, k_matrix);
}

ast.Pause.prototype.make_circuit = function() {
   this.cinterface = make_pause(this);
}

function make_pause(ast_node) {
   let go_list = [];
   let kill_list = [];
   let k_matrix = [[], []];
   let reg = new net.RegisterNet(ast_node, "reg");
   let and_to_reg = net.make_and(ast_node, "and_to_reg");
   let or_to_reg = net.make_or(ast_node, "or_to_reg");
   let and_to_k0 = net.make_and(ast_node, "and_to_k0");

   and_to_reg.connect_to(or_to_reg, net.FAN.STD);
   or_to_reg.connect_to(reg, net.FAN.STD);
   reg.connect_to(and_to_k0, net.FAN.STD);
   reg.connect_to(and_to_reg, net.FAN.STD);
   k_matrix[0][ast_node.depth] = and_to_k0;
   kill_list[ast_node.depth] = net.make_or(ast_node, "kill_depth");
   kill_list[ast_node.depth].connect_to(and_to_reg, net.FAN.NEG);

   for (let i = 0; i <= ast_node.depth; i++) {
      let go = net.make_or(ast_node, "go___" + i);
      let and = net.make_and(ast_node, "and___" + i);

      if (i != ast_node.depth) {
	 let kill = net.make_or(ast_node, "kill___" + i);

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

   return new Interface(ast_node, go_list, and_to_k0, and_to_reg,
			kill_list, reg, k_matrix);
}

ast.Await.prototype.make_circuit = function() {
   this.cinterface = make_abort(this, make_loop(this, make_pause(this)));
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
      let or =  net.make_or(ast_node, "go___" + i);

      or.connect_to(child_interface.go_list[i], net.FAN.STD);
      go_list[i] = or;
   }
   child_interface.k_matrix[0][depth2].connect_to(go_list[depth1],
						  net.FAN.STD);
   for (let i = 1; i < child_interface.k_matrix.length; i++)
      k_matrix[i] = child_interface.k_matrix[i];

   return new Interface(ast_node, go_list, null, null, null,
			child_interface.sel, k_matrix);
}

ast.Nothing.prototype.make_circuit = function() {
   let go_list = [];
   let k_matrix = [[]];

   for (let i = 0; i <= this.depth; i++) {
      let go = net.make_or(this, "go___" + i);

      go_list[i] = go;
      k_matrix[0][i] = go;
   }

   this.cinterface = new Interface(this, go_list, null, null, null, null,
				   k_matrix);
}

ast.Abort.prototype.make_circuit = function() {
   this.children[0].make_circuit();
   if (this.immediate)
      throw new error.InternalError("NYI - expansion", this.loc);
   else
      this.cinterface = make_abort(this, this.children[0].cinterface);
}

function make_abort(ast_node, child_interface) {
   let and1 = net.make_and(ast_node, "and1_sel_res");
   let and2 = net.make_and(ast_node, "and2_nsig_and1");
   let and3 = net.make_and(ast_node, "and3_sig_and1");
   let or = net.make_or(ast_node, "or_and3_k0");
   let go_list = [];
   let k_matrix = [[]];
   let res_list = null;

   for (let i = 0; i <= ast_node.depth; i++) {
      let test_expr = null;
      let go = net.make_or(ast_node, "go___" + i);

      go_list[i] = go;
      go.connect_to(child_interface.go_list[i], net.FAN.STD);

      /* gate for `test_expr` expression (evaluated each tine and1=1) */
      test_expr = ast_node.make_expression([and1], [and3], [and2], i);

      /* gates for initialization of count (evaluated each time GO=1),
	 and decrementation of count (each time and1=1 and test=1) */
      ast_node.make_counter([test_expr, and1], [go_list[i]], [and3], [and2], i);
   }

   and1.connect_to(and2, net.FAN.STD);
   and1.connect_to(and3, net.FAN.STD);
   and3.connect_to(or, net.FAN.STD);

   /* connect SEL of subcircuit */
   if (child_interface.sel)
      child_interface.sel.connect_to(and1, net.FAN.STD);

   /* connect to RES of subcircuit */
   res_list = child_interface.get_res_list();
   for (let i in res_list)
      and2.connect_to(res_list[i], net.FAN.STD);

   /* connect K0 on depth */
   child_interface.k_matrix[0][child_interface.ast_node.depth].connect_to(
      or, net.FAN.STD);
   k_matrix[0][ast_node.depth] = or;

   /* connect K0 on surface and Kn */
   for (let i = 0; i < ast_node.depth; i++)
      k_matrix[0][i] = child_interface.k_matrix[0][i];
   for (let i = 1; i < child_interface.k_matrix.length; i++)
      k_matrix[i] = child_interface.k_matrix[i];

   return new Interface(ast_node, go_list, and1, null, null,
			child_interface.sel, k_matrix);
}

ast.Emit.prototype.make_circuit = function() {
   let go_list = [];
   let k_matrix = [go_list];

   for (let i = 0; i <= this.depth; i++) {
      let go = net.make_or(this, this.signal_name + "_go___" + i);
      let sig_gate = get_signal_gate(this.machine, this.signal_name, i);

      go.connect_to(sig_gate, net.FAN.STD);
      go_list[i] = go;

      if (this.func || this.args_list.length > 0)
	 go.connect_to(new net.SignalExpressionNet(this, this.signal_name +
						   "_signal_expr___" + i, i),
		       net.FAN.STD);
   }

   this.cinterface = new Interface(this, go_list, null, null, null, null,
				   k_matrix);
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
	    k_matrix[i][lvl] = net.make_or(ast_node, "k" + i + "___" + lvl);
	 km[i][lvl].connect_to(k_matrix[i][lvl], net.FAN.STD);
      }
   }

   this.children[0].make_circuit();
   this.children[1].make_circuit();

   for (let i = 0; i <= this.depth; i++) {
      let go = net.make_or(this, "go___" + i);
      let and_then = net.make_and(this, "and_then___" + i);
      let and_else = net.make_and(this, "and_else___" + i);

      this.make_expression([go], [and_then], [and_else], i);

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
	    sel = net.make_or(this, "sel");
	 this.children[i].cinterface.sel.connect_to(sel, net.FAN.STD);
      }

   this.cinterface = new Interface(this, go_list, null, null, null, sel,
				   k_matrix);
}

ast.LocalSignal.prototype.make_circuit = function() {
   let sig = ast.Signal.prototype.make_circuit.call(this);
   let go_list = [];
   let child = this.children[0];

   this.machine.local_signal_map[this.signal_name] = sig;
   child.make_circuit();

   /* We needs a go for local signal in order to be able to know when a
      local sigal is conecptually instantiated, and reset it

      TODO: make ActionNet (and not or net- to reset value */
   for (let i = 0; i <= this.depth; i++) {
      let go = net.make_or(this, "go___" + i);
      go_list[i] = go;
      go.connect_to(child.cinterface.go_list[i], net.FAN.STD);
   }
   this.cinterface = new Interface(this, go_list, null, null, null,
				   child.cinterface.sel,
				   child.cinterface.k_matrix);
}

ast.InputSignal.prototype.make_circuit = function() {
   let sig = ast.Signal.prototype.make_circuit.call(this);

   this.machine.input_signal_map[this.signal_name] = sig;
}

ast.OutputSignal.prototype.make_circuit = function() {
   let sig = ast.Signal.prototype.make_circuit.call(this);

   this.machine.output_signal_map[this.signal_name] = sig;
}

ast.Signal.prototype.make_circuit = function() {
   if (this.valued)
      return new signal.ValuedSignal(this);
   else
      return new signal.Signal(this);
}

ast.Module.prototype.make_circuit = function() {
   let boot_reg = new net.RegisterNet(this, "global_boot_register");
   let const0 = net.make_or(this, "global_const0");

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
   list = child.cinterface.get_res_list();
   if (list)
      for (let i in list)
	 boot_reg.connect_to(list[i], net.FAN.NEG);

   /* connect kill (level 0) of circuit */
   list = child.cinterface.get_kill_list(0)
   if (list)
      for (let i in list)
	 const0.connect_to(list[i], net.FAN.STD);

   /* connect susp of circuit */
   list = child.cinterface.get_susp_list();
   if (list)
      for (let i in list)
	 const0.connect_to(list[i], net.FAN.STD);

   /* connect sel, K0 (level 0) and K1 (level 0) */
   this.machine.sel = child.cinterface.sel;
   if (child.cinterface.k_matrix[0])
      this.machine.k0 = child.cinterface.k_matrix[0][0];
   if (child.cinterface.k_matrix[1])
      this.machine.k1 = child.cinterface.k_matrix[1][0];
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
