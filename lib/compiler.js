"use hopscript"

const ast = require("./ast.js");
const error = require("./error.js");
const net = require("./net.js");
const signal = require("./signal.js");
const lang = require("./lang.js");

/* Interface definition of a circuit */

function Interface(ast_node, go_list, res, susp, kill_list, sel, k_matrix) {
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

/* Helper function go get embeded wires on following intructions:
   - Parallel
   - Sequence
   - If

   `get_res_list`, `get_susp_list` and `get_kill_list` return a list
   indexed by children. The incarnation level must be given for `get_kill_list`.

   If no children has the needed wire, null is return.
 */

ast.ASTNode.prototype.get_res_list = function() { return null }
ast.ASTNode.prototype.get_kill_list = function(level) { return null }
ast.ASTNode.prototype.get_susp_list = function() { return null }

ast.Sequence.prototype.get_res_list = function() {
   let res_list = null;

   for (let i in this.children) {
      let child_interface = this.children[i].cinterface;

      if (child_interface.res) {
	 if (!res_list)
	    res_list = [];
	 res_list.push(child_interface.res);
      }
   }

   return res_list;
}

ast.Sequence.prototype.get_susp_list = function() {
   let susp_list = null;

   for (let i in this.children) {
      let child_interface = this.children[i].cinterface;

      if (child_interface.susp) {
	 if (!susp_list)
	    susp_list = []
	 susp_list.push(child_interface.susp);
      }
   }

   return susp_list;
}

ast.Sequence.prototype.get_kill_list = function(level) {
   /* Beware to not make confusion on the nature of this list : it is indexed
      by *children*, not by incarnation (which is given by `level`) */
   let kill_list = null;

   if (level > this.depth)
      return kill_list;

   for (let i in this.children) {
      let child_interface = this.children[i].cinterface;

      if (child_interface.kill_list && child_interface.kill_list[level]) {
	 if (!kill_list)
	    kill_list = []
	 kill_list.push(child_interface.kill_list[level]);
      }
   }

   return kill_list;
}

/* Circuit translation functions */

ast.ASTNode.prototype.make_circuit = function(env) {
   throw new error.InternalError("`make_circuit` must be implemented",
				 this.loc)
}

ast.Sequence.prototype.make_circuit = function(env) {
   let len = this.children.length;
   let sel = null;
   let k_matrix = [[]];
   let i = 0;

   for (i = 0; i < len; i++)
      this.children[i].make_circuit(env);

   for (i = 0; i < len; i++) {
      let child_interface = this.children[i].cinterface;

      /* connect each KO incarnation of child[N] to each GO incarnation
	 of child[N + 1] */
      if (i + 1 < len) {
	 let next_child_interface = this.children[i + 1].cinterface;
	 let j = 0;

	 for (j in child_interface.k_matrix[0])
	    if (next_child_interface.go_list[j])
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

ast.Pause.prototype.make_circuit = function(env) {
   let go_list = [];
   let or_list = [];
   let kill_list = [];
   let k_matrix = [[], []];

   let and1_susp_sel = net.make_and(this, "and_susp_sel");
   let and3_reg_res = net.make_and(this, "and_reg_res");
   let reg = new net.RegisterNet(this, "reg");

   reg.connect_to(and3_reg_res, net.FAN.STD);
   reg.connect_to(and1_susp_sel, net.FAN.STD);
   k_matrix[0][this.depth] = and3_reg_res;

   for (let i = 0; i <= this.depth; i++) {
      let go = net.make_or(this, "go___" + i);
      let or = net.make_or(this, "or_go_and1___" + i);
      let and2 = net.make_and(this, "and2_or_kill___" + i);
      let kill = net.make_or(this, "kill___" + i);

      go_list[i] = go;
      k_matrix[1][i] = go;
      or_list[i] = or;
      kill_list[i] = kill;

      go.connect_to(or, net.FAN.STD);
      and1_susp_sel.connect_to(or, net.FAN.STD);
      or.connect_to(and2, net.FAN.STD);
      kill.connect_to(and2, net.FAN.NEG);
      and2.connect_to(reg, net.FAN.STD);
   }

   this.cinterface = new Interface(this, go_list, and3_reg_res, and1_susp_sel,
				   kill_list, reg, k_matrix);
}

ast.Emit.prototype.make_circuit = function(env) {
   let go_list = [];
   let k_matrix = [go_list];

   for (let i = 0; i <= this.depth; i++) {
      let go = net.make_or(this, "go___" + i);
      let sig_gate = get_signal_gate(env, this.signal_name, i);

      go.connect_to(sig_gate, net.FAN.STD);
      go_list[i] = go;
   }

   this.cinterface = new Interface(this, go_list, null, null, null, null,
				   k_matrix);
}

ast.If.prototype.make_circuit = function(env) {
   let go_list = [];
   let sel = null;
   let k_matrix = [[]];

   function connect_k(km, lvl) {
      for (let i in km) {
	 if (!k_matrix[i])
	    k_matrix[i] = [];
	 if (!k_matrix[i][lvl])
	    k_matrix[i][lvl] = net.make_or(this, "k" + i + "___" + lvl);
	 km[i][lvl].connect_to(k_matrix[i][lvl], net.FAN.STD);
      }
   }

   this.children[0].make_circuit(env);
   this.children[1].make_circuit(env);

   for (let i = 0; i < this.depth; i++) {
      let args = [];
      let go = net.make_or(this, "go___" + i);
      let and_then = net.make_and(this, "and_then___" + i);
      let and_else = net.make_and(this, "and_else___" + i);
      let test = new net.TestExpressionNet(this, "test___" + i, this.func, args)

      for (let j in this.args) {
	 let arg = this.args[j];

	 if (arg instanceof lang.SignalAccessor) {
	    let gate = null;

	    if (arg.get_value) {
	       let sobj = get_signal_object(this.machine, arg.signal_name);

	       args.push({ pre: arg.get_pre, signal: sobj});
	       gate = arg.get_pre
		  ? sobj.pre_gate
		  : sobj.dependency_gate_list[i];
	    } else if (arg.get_pre) {
	       gate = get_signal_pre_gate(env, signal_name);
	       args.push(gate);
	    } else {
	       gate = get_signal_gate(env, signal_name, i);
	       args.push(gate);
	    }

	    gate.connect_to(test, net.FAN.DEP);
	    test.connect_to(and_then, net.FAN.STD);
	    test.connect_to(and_else, net.FAN.NEG);
	 } else {
	    args.push(arg);
	 }
      }
      go.connect_to(test, net.FAN.STD);
      go.connect_to(and_then, net.FAN.STD);
      go.connect_to(and_else, net.FAN.STD);

      and_then.connect_to(this.children[0].cinterface.go_list[i]);
      and_else.connect_to(this.children[1].cinterface.go_list[i]);

      connect_k(this.children[0].cinterface.k_matrix, i);
      connect_k(this.children[1].cinterface.k_matrix, i);
      go[i] = go;
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

ast.LocalSignal.prototype.make_circuit = function(env) {
   let sig = ast.Signal.prototype.make_circuit.call(this, env);
   let name = this.signal_name;

   this.machine.local_signal_map[name] = sig;
   env.local_signal_map[name] = sig;

   this.children[0].make_circuit(env);

   delete env.local_signal_map[name];
}

ast.InputSignal.prototype.make_circuit = function(env) {
   let sig = ast.Signal.prototype.make_circuit.call(this, env);
   let name = this.signal_name;

   this.machine.input_signal_map[name] = sig;
   env.input_signal_map[name] = sig;
}

ast.OutputSignal.prototype.make_circuit = function(env) {
   let sig = ast.Signal.prototype.make_circuit.call(this, env);
   let name = this.signal_name;

   this.machine.output_signal_map[name] = sig;
   env.output_signal_map[name] = sig;
}

ast.Signal.prototype.make_circuit = function(env) {
   let gate_list = [];
   let pre_gate = net.make_or(this, "pre" + this.signal_name);
   let sig = null;

   for (let i = 0; i <= this.depth; i++)
      gate_list[i] = net.make_or(this, this.signal_name + "___" + i);

   if (this.valued)
      sig = new signal.ValuedSignal(this.signal_name, gate_list, pre_gate,
				    this.combine_with, this.init_value)
   else
      sig = new signal.Signal(this.signal_name, gate_list, pre_gate);
   return sig;
}

ast.Module.prototype.make_circuit = function(env) {
   let boot_reg = new net.RegisterNet(this, "global_boot_register");
   let const0 = net.make_or(this, "global_const0");

   const0.connect_to(boot_reg, net.FAN.STD);
   this.machine.boot_reg = boot_reg;

   /* build environment */
   env.input_signal_map = {};
   env.output_signal_map = {};
   env.local_signal_map = {};

   /* translation of program */
   let i = null;
   for (i in this.children) {
      this.children[i].make_circuit(env);
   }

   /* last children is the reactive program code */
   let child = this.children[i];
   let list = null;

   /* connect global boot register and res of circuit */
   boot_reg.connect_to(child.cinterface.go_list[0], net.FAN.STD);
   list = child.get_res_list();
   if (list)
      for (let i in list)
	 boot_reg.connect_to(list[i], net.FAN.NEG);

   /* connect kill (level 0) of circuit */
   list = child.get_kill_list(0)
   if (list)
      for (let i in list)
	 const0.connect_to(list[i], net.FAN.STD);

   /* connect susp of circuit */
   list = child.get_susp_list();
   if (list)
      for (let i in list)
	 const0.connect_to(list[i], net.FAN.STD);

   /* connect sel, K0 (level 0) and K1 (level 0) */
   this.machine.sel = child.cinterface.sel;
   this.machine.k0 = child.cinterface.k_matrix[0][0];
   if (child.cinterface.k_matrix[1])
      this.machine.k1 = child.cinterface.k_matrix[1][0];
}

/* Helper function that gives a signal gate at a specific incarnation level */

function get_signal_gate(env, signal_name, lvl) {
   let gate_list = get_signal_object(env, signal_name).gate_list;

   if (gate_list.length < lvl)
      return gate_list[gate_list.length - 1];
   return gate_list[lvl];
}

/* Helper function that gives a signal at a specific incarnation level */

function get_signal_pre_gate(env, signal_name) {
   return get_signal_object(env, signal_name).pre_gate;
}

/* Helper function that gives a signal object */

function get_signal_object(env, signal_name) {
   return (env.input_signal_map[signal_name] ||
	   env.output_signal_map[signal_name] ||
	   env.local_signal_map[signal_name]);
}

/* Visitors and functions thats decorates the AST before circuit translation */

function RenameLocalSignalVisitor() {
   this.next_id = 0;
   this.map_old_to_new = {};
}

RenameLocalSignalVisitor.prototype.visit = function(ast_node) {
   if (ast_node instanceof ast.LocalSignal) {
      let old_name = ast_node.signal_name;
      let new_name = old_name + "___LOCAL_" + this.next_id;

      ast_node.signal_name = new_name;
      this.map_old_to_new[old_name] = new_name;
      this.next_id++;
   } else if (ast_node.signal_name) {
      let name = ast_node.signal_name;
      let mapped_name = this.map_old_to_new[name];

      if (mapped_name)
	 ast_node.signal_name = mapped_name;
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
   ast_node.make_circuit({});
}

exports.compile = compile
