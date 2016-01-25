"use hopscript"

/* TODO:
   - clean compil tmp objets
*/

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

   if (first_stmt) {
      for (let i in first_stmt.go)
	 this.machine.go.push(first_stmt.go[i])
      for (let i in first_stmt.res)
	 this.machine.res.push(first_stmt.res[i]);
      for (let i in first_stmt.susp)
	 this.machine.susp.push(first_stmt.susp[i]);
      for (let i in first_stmt.kill)
	 this.machine.kill.push(first_stmt.kill[i]);
   }

   if (last_stmt instanceof ast.Signal) {
      for (let i in last_stmt.sel)
	 this.machine.sel.push(last_stmt.sel[i])
      for (let i in last_stmt.k)
	 for (let j in last_stmt.k[i])
	    this.machine.k[i].push(last_stmt.k[i][j]);
   }
}

ast.Emit.prototype.make_circuit = function() {
   this.k[0] = [];
   var go = new net.Net(this);

   go.connect_to(this.get_signal(), false);
   this.go.push(go);
   this.k[0].push(go);
}

ast.Pause.prototype.make_circuit = function() {
   var wire1 = new net.Net(this);
   var and1 = net.makeAnd(this);
   var or1 = net.makeOr(this);
   var and2 = net.makeAnd(this);
   var reg = new net.Register(this);
   var and3 = net.makeAnd(this);
   var negkill = new net.Net(this);

   and1.connect_to(or1, false);
   or1.connect_to(and2, false);
   and2.connect_to(reg, false);
   reg.connect_to(and3, false);
   reg.connect_to(and1, false);
   negkill.connect_to(and2, true);

   this.go.push(or1);
   this.go.push(wire1);
   this.res = [ and3 ];
   this.susp = [ and1 ];
   this.kill = [ negkill ];
   this.k[0] = [ and3 ];
   this.k[1] = [wire1 ];
   this.sel = [ reg ];
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
   var len = this.children.length;

   for (let i in this.children)
      this.children[i].make_circuit();

   /* connect sequence GO to first stmt GO */
   for (let i in this.children[0].go)
      this.go.push(this.children[0].go[i]);

   var k_or = [];
   var sel_or = net.makeOr(this);
   this.sel.push(sel_or);

   for (let c = 0; c < len; c++) {
      let child = this.children[c];
      console.log("**************", child.name);

      /* connect sequence RES, SUSP and KILL to stmts RES, SUSP and KILL */
      for (let i in child.res)
	 this.res.push(child.res[i]);
      for (let i in child.susp)
	 this.susp.push(child.susp[i]);
      for (let i in child.kill)
	 this.kill.push(child.kill[i]);

      /* connect SEL stmts to sel_or */
      for (let i in child.sel)
	 child.sel[i].connect_to(sel_or, false);

      /* connect stmts K[i>0] to sequence K[i>0] */
      for (let i = 1; i < child.k.length; i++) {
	 console.log("connect k"+i);
	 for (let j in child.k[i]) {
	    if (!k_or[i])
	       k_or[i] = net.makeOr(this);
	    child.k[i][j].connect_to(k_or[i], false);
	 }
      }

      /* connect K0 of previous stmt to GO of following stmt */
      if (c + 1 < len) {
	 console.log("---", c, len);
	 for (let i in child.k[0])
	    for (let j in this.children[i + 1].go) {
	       console.log("connect", child.name, "to",
			   this.children[c+1].name,
			   child.k[0][i].constructor.name,
			   this.children[c + 1].go[j].constructor.name);
	       child.k[0][i].connect_to(this.children[c + 1].go[j], false);
	    }
	 console.log("---");
      }
   }

   for (let i in k_or)
      this.k[i + 1] = [ k_or[i] ];

   /* connect last stmt K0 to sequence K0 */
   let last = this.children[len - 1];
   this.k[0] = [];
   for (let i in last.k[0])
      this.k[0].push(last.k[0][i]);
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
