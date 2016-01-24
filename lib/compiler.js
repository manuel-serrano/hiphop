"use hopscript"

var ast = require("./ast.js");
var error = require("./error.js");
var net = require("./net.js");

ast.ASTNode.prototype.get_signal = function() {
   if (!this.signal_name)
      throw new error.InternalError("Call `get_signal` forbidden", this.loc)
   return this.machine.input_signals[this.signal_name]
      || this.machine.output_signals[this.signal_name]
      || this.machine.local_signals[this.signal_name][incarnation];
}

ast.ASTNode.prototype.go = [];
ast.ASTNode.prototype.res = [];
ast.ASTNode.prototype.susp = [];
ast.ASTNode.prototype.kill = [];
ast.ASTNode.prototype.sel = [];
ast.ASTNode.prototype.k = [[]];
ast.ASTNode.prototype.sig = {};

ast.ASTNode.prototype.connet_go = function(net_in) {}
ast.ASTNode.prototype.connect_res = function(net_in) {}
ast.ASTNode.prototype.connect_susp = function(net_in) {}
ast.ASTNode.prototype.connect_kill = function(net_in) {}
ast.ASTNode.prototype.connect_sel = function(net_in) {}
ast.ASTNode.prototype.connect_k = function(net_in, code) {}
ast.ASTNode.prototype.connect_sig = function() {}

ast.ASTNode.prototype.make_circuit = function() {
   throw new error.InternalError("`make_circuit` must be implemented.",
				 this.loc);
}

ast.ASTNode.prototype.connect_circuit = function() {}

ast.Emit.prototype.make_circuit = function() {
   var go = new Net(this);

   net.connect(go, this.get_signal(), false);
   this.go.push(go);
   this.k[0].push(go);
}

ast.Pause.prototype.make_circuit = function() {
   var wire1 = new Net(this);
   var and1 = net.makeAnd(ast);
   var or1 = net.makeOr(ast);
   var and2 = net.makeAnd(ast);
   var reg = new Register(this);
   var and3 = net.makeAnd(ast);

   net.connect(wire1, or1)
   net.connect(and1, or1);
   net.connect(or1, and2);
   net.conect(and2, reg);
   net.connect(reg, and3);
   net.connect(reg, and1);

   this.go.push(or1);
   this.go.push(wire1);
   this.res.push(and3);
   this.susp.push(and1);
   this.kill.push(and2);

   this.k[0].push(and3);
   this.k[1].push(wire1);
   this.sel.push(res);
}

ast.Loop.prototype.make_circuit = function() {
   var or = net.makeOr(ast);

   this.children[0].make_circuit();

   this.go.push(or);
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
	 Signal.prototype.make_signal.call(this))
}

ast.InputSignal.prototype.make_circuit = function() {
   this.machine.input_signals[this.signal_name] =
      Signal.prototype.make_signal.call(this);
}

ast.OutputSignal.prototype.make_circuit = function() {
   this.machine.output_signals[this.signal_name] =
      Signal.prototype.make_signal.call(this);
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

function MakeCircuitVisitor() {
}

MakeCircuitVisitor.prototype.visit = function(node) {
   node.make_circuit();
}

function GetFirstAndLastStmtVisitor() {
   this.first = null;
   this.last = null;
}

function compile(machine, ast) {
   ast.accept(new InitVisitor(machine));
   ast.accept_auto(new MakeCircuitVisitor());
   ast.accept(new PrintTreeVisitor());

   
}

exports.compile = compile;
