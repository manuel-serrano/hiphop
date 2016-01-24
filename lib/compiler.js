"use hopscript"

/* TODO:
   - clean compil tmp objets
*/

var ast = require("./ast.js");
var error = require("./error.js");
var net = require("./net.js");

function pull_child_circuits_in(parent, child) {
   for (let i in child.go)
      parent.go.push(child.go[i])
   for (let i in child.res)
      parent.res.push(child.res[i]);
   for (let i in child.susp)
      parent.res.push(child.susp[i]);
   for (let i in child.kill)
      parent.res.push(child.kill[i]);
}

function pull_child_circuits_out(parent, child) {
   for (let i in child.sel)
      parent.sel.push(child.sel[i])
   for (let i in child.k)
      for (let j in child.k[i])
	 parent.k[i].push(child.k[i][j]);
}

ast.ASTNode.prototype.get_signal = function() {
   if (!this.signal_name)
      throw new error.InternalError("Call `get_signal` forbidden", this.loc)
   return this.machine.input_signals[this.signal_name]
      || this.machine.output_signals[this.signal_name]
      || this.machine.local_signals[this.signal_name][incarnation];
}

ast.ASTNode.prototype.make_circuit = function() {}

ast.HipHop.prototype.make_circuit = function() {
   var first_stmt = null;
   var last_stmt = null;

   for (let i in this.children) {
      let child = this.children[i];

      child.make_circuit();
      if (!first_stmt && !(child instanceof ast.Signal))
	 first_stmt = child;
      last_stmt = child;
   }

   if (first_stmt)
      pull_child_circuits_in(this.machine, first_stmt);

   if (last_stmt instanceof ast.Signal)
      pull_child_circuits_out(this.machine, last_stmt);
}

ast.Emit.prototype.make_circuit = function() {
   this.k[0] = [];
   var go = new net.Net(this);

   net.connect(go, this.get_signal(), false);
   this.go.push(go);
   this.k[0].push(go);
}

ast.Pause.prototype.make_circuit = function() {
   this.k[0] = [];
   this.k[1] = [];
   var wire1 = new net.Net(this);
   var and1 = net.makeAnd(this);
   var or1 = net.makeOr(this);
   var and2 = net.makeAnd(this);
   var reg = new net.Register(this);
   var and3 = net.makeAnd(this);
   var negkill = new net.Net(this);

   net.connect(and1, or1, false);
   net.connect(or1, and2, false);
   net.connect(and2, reg, false);
   net.connect(reg, and3, false);
   net.connect(reg, and1, false);
   net.connect(negkill, and2, true);

   this.go.push(or1);
   this.go.push(wire1);
   this.res.push(and3);
   this.susp.push(and1);
   this.kill.push(negkill);
   this.k[0].push(and3);
   this.k[1].push(wire1);
   this.sel.push(reg);
}

ast.Loop.prototype.make_circuit = function() {
   var child = this.children[0];
   var or = net.makeOr(this);

   child.make_circuit();

   for (let i in child.go)
      net.connect(or, child.go[i]. false);
   for (let i in child.k[0])
      net.connect(child.k[0][i], or, false);
   for (let i in child.res)
      this.res.push(child.res[i]);
   for (let i in child.susp)
      this.susp.push(child.susp[i]);
   for (let i in child.kill)
      this.kill.push(child.kill[i]);
   for (let i = 1; i < child.k.length; i++)
      for (let j in child.k[i])
	 this.k[i].push(child.k[i][j]);
   for (let i in child.sel)
      this.sel.push(child.sel[i]);
}

ast.Sequence.prototype.make_circuit = function() {
}

ast.Signal.prototype.make_circuit = function() {
   if (this.valued)
      return new net.ValuedSignal(this, this.signal_name, this.combine_with,
				  this.init_value, this.type);
   return new net.Signal(this, this.signal_name);
}

ast.LocalSignal.prototype.make_circuit = function() {
   this.machine.local_signals[this.signal_name] = [];
   for (var i in this.incarnation)
      this.machine.local_signals[this.signal_name].push(
	 ast.Signal.prototype.make_circuit.call(this))
}

ast.InputSignal.prototype.make_circuit = function() {
   this.machine.input_signals[this.signal_name] =
      ast.Signal.prototype.make_circuit.call(this);
}

ast.OutputSignal.prototype.make_circuit = function() {
   this.machine.output_signals[this.signal_name] =
      ast.Signal.prototype.make_circuit.call(this);
}

/* Debug printing of AST tree */

function PrintTreeVisitor() {
   this.indent = "+-- ";
   this.INDENT_UNIT = "   ";
}

PrintTreeVisitor.prototype.visit = function(node) {
   var buf = this.indent + node.name;
   var buf_parent = node.parent == null ? "N/A" : node.parent.name;

   if (node instanceof ast.Emit
       || node instanceof ast.Await
       || node instanceof ast.Abort
       || node instanceof ast.Suspend
       || node instanceof ast.Present
       || node instanceof ast.Signal)
      buf = buf + " " + node.signal_name;
   else if (node instanceof ast.Trap)
      buf = buf + " " + node.trap_name;
   else if (node instanceof ast.Exit)
      buf = buf + " " + node.trap_name + " " + node.return_code;

   console.log(buf
	       + " [parent: "
	       + buf_parent
	       + " / lvl: "
	       + node.incarnation + "]");

   var prev_indent = this.indent;

   this.indent = this.INDENT_UNIT + this.indent;
   for (var i in node.children)
      node.children[i].accept(this);
   this.indent = prev_indent;
}

/* This visitor initialize the AST with the machine which own it,
   compule trap exit code, incarnation levels, and check names */

function InitVisitor(machine) {
   this.machine = machine;

   /* reincarnation data */
   this.in_loop = 0;
   this.lvl = 0;
   this.down_at_loop_out = 0;

   /* check name data */
   this.trap_names = [];
   this.signal_names = [];

   /* trap data */
   this.trap_stack = [];
}

InitVisitor.prototype.visit = function(node) {
   var node_instanceof_loop = node instanceof ast.Loop;
   var node_instanceof_parallel = node instanceof ast.Parallel;
   var node_instanceof_trap = node instanceof ast.Trap;

   node.machine = this.machine;
   this.set_compilation_properties(node);
   this.check_name(node);

   if (node_instanceof_parallel && this.in_loop > 0) {
      this.lvl++;
   } else if (node_instanceof_loop) {
      this.in_loop++;
   } else if (node instanceof ast.LocalSignal && this.in_loop > 0) {
      this.lvl++;
      this.down_at_loop_out++;
   } else if (node instanceof ast.Pause && this.lvl > 0) {
      node.new_incarnation_on_k0 = true;
   } else if (node_instanceof_trap) {
      this.trap_stack.push(node.trap_name);
   }

   node.incarnation = this.lvl;
   for (var i in node.children)
      node.children[i].accept(this);

   if (node_instanceof_loop) {
      node.in_loop--;
      this.lvl -= this.down_at_loop_out;
      this.down_at_loop_out = 0;
   } else if (node_instanceof_parallel && this.in_loop > 0) {
      this.lvl--;
   } else if (node_instanceof_trap) {
      this.trap_stack.pop();
   } else if (node instanceof ast.Exit) {
      let offset = this.trap_stack.length
	  - this.trap_stack.indexOf(node.trap_name) - 1;
      node.return_code += offset;
   }
}

InitVisitor.prototype.check_name = function(node) {
   var name = node.signal_name || node.trap_name;

   if (node instanceof ast.Signal) {
      if (this.signal_names.indexOf(name) > -1)
	 throw new error.SyntaxError("Signal name `" + name + "` already used",
				     node.loc)
      this.signal_names.push(name);
   } else if (node instanceof ast.Trap) {
      if (this.trap_names.indexOf(name) > -1)
	 throw new error.SyntaxError("Trap name `" + name + "` already used",
				     node.loc)
      this.trap_names.push(name);
   } else if (node.signal_name) {
      if (this.signal_names.indexOf(name) == -1)
	 throw new error.SyntaxError("Unknown signal identifier `"
				     + name + "`", node.loc)
   } else if (node instanceof ast.Exit) {
      if (this.trap_names.indexOf(name) == -1)
	 throw new error.SyntaxError("Unknown trap identifier `"
				     + name + "`", node.loc);
   }
}

InitVisitor.prototype.set_compilation_properties = function(node) {
   node.go = [];
   node.res = [];
   node.susp = [];
   node.kill = [];
   node.sel = [];
   node.k = [];
}

function FreeVisitor() {}

FreeVisitor.prototype.visit = function(node) {
   delete node.go;
   delete node.res;
   delete node.susp;
   delete node.kill;
   delete node.sel;
   delete node.k;
}

function compile(machine, ast) {
   ast.accept(new InitVisitor(machine));
   ast.accept(new PrintTreeVisitor());
   ast.make_circuit();
   ast.accept_auto(new FreeVisitor());
}

exports.compile = compile;
