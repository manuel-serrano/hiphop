"use hopscript"

var ast = require("./ast.js");
var error = require("./error.js");
var net = require("./net.js");

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

ast.Emit.prototype.make_circuit = function() {
   var wire_go = new Net(this);
   var wire_sig = new Net(this);

   this.go.push(wire_go);
   this.go.push(wire_sig);
   this.k[0].push(wire_go);
   this.sig[this.signal_name].push(wire_sig);
}

ast.Pause.prototype.make_circuit = function() {
   var wire1 = new Net(this);
   var and1 = new LogicalDoor(this, true);
   var or1 = new LogicalDoor(this, false);
   var and2 = new LogicalDoor(this, true);
   var reg = new Register(this);
   var and3 = new LogicalDoor(this, true);

   net.connect(wire1, or1)
   net.connect(and1, or1);
   net.connect(or1, and2);
   net.conect(and2, reg);
   net.connect(reg, and3);
   net.connect(reg, and1);

   this.go.push(or1);
   this.res.push(and3);
   this.susp.push(and1);
   this.kill.push(and2);

   this.k[0].push(and3);
   this.k[1].push(wire1);
   this.sel.push(res);
}

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
}

InitVisitor.prototype.visit = function(node) {
   var node_instanceof_loop = node instanceof ast.Loop;
   var node_instanceof_parallel = node instanceof ast.Parallel;

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
   }
}

InitVisitor.prototype.check_name(node) {
   if (node instanceof ast.Signal) {
      let name = node.signal_name;

      if (this.signal_names.indexOf(name) > -1)
	 throw new error.SyntaxError("Signal name `" + name + "` already used",
				     node.loc)
      this.signal_names.push(node.signal_name);
   else if (node instanceof ast.Trap) {
      let name = node.trap_name;

      if (this.trap_names.indexOf(name) > -1)
	 throw new error.SyntaxError("Trap name `" + name + "` already used",
				     node.loc)
      this.trap_names.push(node.signal_name);
   } else if (node.signal_name
	    && this.signal_names.indexOf(node.signal_name) == -1)
      throw new error.SyntaxError("Unknown signal identifier `"
				  + node.signal_name + "`", node.loc)
   else if (node instanceof ast.Exit
	    && this.trap_names.indexOf(node.trap_name) == -1)
      throw new error.SyntaxError("Unknown trap identifier `"
				  + node.trap_name + "`", node.loc);
}

function compile(machine, ast) {
   act.accept(new InitVisitor(machine));
   ast.accept(new BuildCircuitVisitor(machine));
   ast.accept(new ConnectCircuitVisitor());
   ast.accept(new PrintTreeVisitor());
}

exports.compile = compile;
