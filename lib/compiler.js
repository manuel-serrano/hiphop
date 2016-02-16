"use hopscript"

const ast = require("./ast.js");
const error = require("./error.js");
const net = require("./net.js");
const lang = require("./lang.js");

/* Interface definition of a circuit */

function Interface(ast_node, go_list, res, susp, kill_list, sel, k_matrix) {
   if (!(go_list instanceof Array))
      error.InternalError("`go_list` must be an array.", ast_node.loc);
   this.go_list = go_list;

   if (kill_list && !(kill_list instanceof Array))
      error.InternalError("`kill_list` must be an array.", ast_node.loc);
   this.kill_list = kill_list;

   if (!(k_matrix instanceof Array))
      error.InternalError("`k_matrix must be a matrix.", ast_node.loc);

   for (let i in k_matrix)
      if (!(k_matrix[i] instanceof Array))
	 error.InternalError("Each completion code of `k_matrix` must be "+
			     "an array.", ast_node.loc);

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
ast.ASTNode.prototype.get_kill_list = function(level) { return null } ast.ASTNode.prototype.get_susp_list = function() { return null }

ast.Sequence.prototype.get_res_list = function() {
   let res_list = null;

   for (let i in this.children) {
      let child = this.children[i].cinterface;

      if (child.res) {
	 if (!res_list)
	    res_list = [];
	 res_list.push(child.res);
      }
   }

   return res_list;
}

ast.Sequence.prototype.get_susp_list = function() {
   let susp_list = null;

   for (let i in this.children) {
      let child = this.children[i].cinterface;

      if (child.susp) {
	 if (!susp_list)
	    susp_list = []
	 susp_list.push(child.susp);
      }
   }

   return res_list;
}

ast.Sequence.prototype.get_kill_list = function(level) {
   /* Beware to not make confusion on the nature of this list : it is indexed
      by *children*, not by incarnation (which is given by `level`) */
   let kill_list = null;

   if (level > this.depth)
      return kill_list;

   for (let i in children) {
      let child = this.children[i].cinterface;

      if (child.kill_list[level]) {
	 if (!kill_list)
	    kill_list = []
	 kill_list.push(child.kill_list[level]);
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
   let i = 0;

   for (i = 0; i < len; i++)
      this.children[i].make_circuit(env);

   for (i = 0; i < len; i++) {
      let child = this.children[i].cinterface;

      if (i + 1 < len) {
	 let next_child = this.children[i + 1].cinterface;
	 let j = 0;

	 for (j in child.k[0])
	    if (next_child.go[j])
	       child.k[0][j].connect_to(next_child.go[j], net.FAN.STD);
      }

      if (child.sel) {
	 if (!sel)
	    net.make_or(this, "sel");
	 child.sel.connect_to(sel_or, net.FAN.STD);
      }
   }

   this.cinterface = new Interface(this, this.children[0].cinterface.go_list,
				   null, null, null, sel,
				   this.children[len - 1].cinterface.k_matrix);
}

ast.Pause.prototype.make_circuit = function(env) {
   let go_list = [];
   let or_list = [];
   let kill_list = [];
   let k_matrix = [[], []];

   let and1_susp_sel = net.make_and(this, "and_susp_sel");
   let and3_reg_res = net.make_and(this, "and_reg_res");
   let reg = new net.RegisterNet(this. "reg");

   reg.connect_to(and_reg_res, net.FAN_STD);
   reg.connect_to(and_susp_sel, net.FAN_STD);

   for (let i = 0; i <= this.depth; i++) {
      let go = net.make_or(this, "go___" + i);
      let or = net.make_or(this, "or_go_and1___" + i);
      let and2 = net.make_and(this, "and2_or_kill___" + i);
      let kill = net.make_or(this, "kill___" + i);

      go_list[i] = go;
      k_matrix[1][i] = go;
      or_list[i] = or;
      kill_list[i] = kill;

      go.connect_to(or, net.FAN_STD);
      and1_susp_sel.connect_to(or, net.FAN_STD);
      or.connect_to(and2, net.FAN_STD);
      kill.connect_to(and2, net.FAN.NEG);
      and2.connect_to(reg, net.FAN.STD);
   }

   this.cinterface = new Interface(go_list, and3_reg_res, and1_susp_sel,
				   kill_list, reg, k_matrix);
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
				     " local signal declaration with same name" +
				     " `" + name + "`", ast_node.loc);
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
   //let env = new Interface();
   compute_depth(ast_node, 0, false, false);
   console.log(ast_node.pretty_print(0));
   //ast_node.make_circuit(env);
}

exports.compile = compile
