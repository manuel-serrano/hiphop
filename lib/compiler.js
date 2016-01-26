"use hopscript"

var ast = require("./ast.js");
var error = require("./error.js");
var net = require("./net.js");
var signal = require("./signal.js");

function Interface(go, res, susp, kill, sel, k) {
   if (go)
      this.go = go instanceof Array ? go : [ go ];
   else
      this.go = [];

   if (res)
      this.res = res instanceof Array ? res : [ res ];
   else
      this.res = [];

   if (susp)
      this.susp = susp instanceof Array ? susp : [ susp ];
   else
      this.susp = [];

   if (kill)
      this.kill = kill instanceof Array ? kill : [ kill ];
   else
      this.kill = [];

   this.sel = sel;

   if (k) {
      if (!(k instanceof Array))
	 error.InternalError("assert k instanceof Array failed", undefined);
      this.k = k;
   } else
      this.k = [];
}

ast.ASTNode.prototype.make_circuit = function(ast_node) {
   throw new error.InternalError("`make_circuit` must be implemented",
				 ast_node.loc)
}

ast.ASTNode.prototype.connect_circuit = function(ast_node) {}

function make_pause(ast_node) {
   var wire1 = new net.Net(ast_node);
   var and1 = net.makeAnd(ast_node);
   var or1 = net.makeOr(ast_node);
   var and2 = net.makeAnd(ast_node);
   var reg = new net.Register(ast_node);
   var and3 = net.makeAnd(ast_node);
   var negkill = new net.Net(ast_node);

   and1.connect_to(or1, false);
   or1.connect_to(and2, false);
   and2.connect_to(reg, false);
   reg.connect_to(and3, false);
   reg.connect_to(and1, false);
   negkill.connect_to(and2, true);

   return new Interface([or1, wire1], and3, and1, negkill, reg, [and3, wire1]);
}

function make_sequence(ast_node, subcircuit) {
   var len = subcircuit.length;
   var sel = net.makeOr(ast_node)
   var k = [];
   var seq_interface = new Interface([], [], [], [], sel, k)

   /* connect sequence GO to first stmt GO */
   for (let i in subcircuit[0].go)
      seq_interface.go.push(subcircuit[0].go[i]);

   for (let c = 0; c < len; c++) {
      let circuit = subcircuit[c];

      /* connect sequence RES, SUSP and KILL to stmts RES, SUSP and KILL */
      for (let i in circuit.res)
	 seq_interface.res.push(circuit.res[i]);
      for (let i in circuit.susp)
	 seq_interface.susp.push(circuit.susp[i]);
      for (let i in circuit.kill)
	 seq_interface.kill.push(circuit.kill[i]);

      /* connect SEL stmt to SEL sequence */
      circuit.sel.connect_to(sel, false);

      /* connect stmts K[i>0] to sequence K[i>0] */
      for (let i = 1; i < circuit.k.length; i++) {
	 if (!k[i])
	    k[i] = net.makeOr(ast_node);
	 circuit.k[i].connect_to(k[i], false);
      }

      /* connect K0 of previous stmt to GO of following stmt */
      if (c + 1 < len)
	 for (let i in subcircuit[c + 1].go)
	    circuit.k[0].connect_to(subcircuit[c + 1].go[i], false);
   }

   /* connect last stmt K0 to sequence K0 */
   k[0] = subcircuit[len - 1].k[0];

   return seq_interface;
}

function make_loop(ast_node, subcircuit) {
}

function make_emit(ast_node) {
   var net;

   get_signal(ast_node);
   net = new net.Emit(ast_node);
   ast_node.signal.add_emitter(ast_node, ast_node.callee || ast_node.args);
   return new Interface(net, undefined, undefined, undefined, undefined, [ net ]);
}

ast.Module.prototype.make_circuit = function() {
   var first_stmt = null;
   var last_stmt = null;

   this.machine.go = new net.Register(this);
   this.machine.res = new net.Register(this);
   this.machine.susp = new net.Register(this);
   this.machine.kill = new net.Register(this);

   for (let i in this.children) {
      let child = this.children[i];

      child.make_circuit();
      if (!first_stmt && !(child instanceof ast.Signal))
	 first_stmt = child;
      last_stmt = child;
   }

   if (first_stmt) {
      for (let i in first_stmt.go)
	 this.machine.go.connect_to(first_stmt.go[i], false)
      for (let i in first_stmt.res)
	 this.machine.res.connect_to(first_stmt.res[i], false);
      for (let i in first_stmt.susp)
	 this.machine.susp.connect_to(first_stmt.susp[i], false);
      for (let i in first_stmt.kill)
	 this.machine.kill.connect_to(first_stmt.kill[i], false);
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
   this.circuit = make_emit(this)
}

ast.Pause.prototype.make_circuit = function() {
   this.circuit = make_pause(this);
}

ast.Halt.prototype.make_circuit = function() {
   this.circuit = make_halt(this);
}

ast.Sequence.prototype.make_circuit = function() {
   var subcircuit = [];

   for (let i in this.children) {
      this.children[i].make_circuit();
      subcircuit.push(this.children[i].circuit)
   }
   this.circuit = make_sequence(this, subcircuit);
}

/* Signal instantiation and assignation on machine and ast node that use them */

function instantiate_signal(ast_node) {
   if (ast_node.valued)
      return new signal.ValuedSignal(ast_node,
				     ast_node.signal_name,
				     ast_node.combine_with,
				     ast_node.init_value,
				     ast_node.type);
   return new signal.Signal(ast_node, ast_node.signal_name);
}

function get_signal(ast_node) {
   if (ast_node.signal)
      return;

   var name = ast_node.signal_name;
   var machine = ast_node.machine;

   ast_node.signal = machine.input_signals[name]
      || machine.output_signals[name]
      || machine.local_signals[name][ast_node.incarnation]
}

ast.LocalSignal.prototype.make_circuit = function() {
   this.machine.local_signals[this.signal_name] = [];
   for (var i in this.incarnation)
      this.machine.local_signals[this.signal_name].push(instantiate_signal(this));
}

ast.InputSignal.prototype.make_circuit = function() {
   this.machine.input_signals[this.signal_name] = instantiate_signal(this);
}

ast.OutputSignal.prototype.make_circuit = function() {
   this.machine.output_signals[this.signal_name] = instantiate_signal(this);
}

/* This visitor connect circuit. At this state, lot on circuit are already
   connected, but it remains to connect dependencies of present/signal accessor
   to the actual emitters */

function ConnectCircuitVisitor() {}

ConnectCircuitVisitor.prototype.visit = function(ast_node) {
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

InitVisitor.prototype.visit = function(ast_node) {
   var ast_node_instanceof_loop = ast_node instanceof ast.Loop;
   var ast_node_instanceof_parallel = ast_node instanceof ast.Parallel;
   var ast_node_instanceof_trap = ast_node instanceof ast.Trap;

   ast_node.machine = this.machine;
   this.check_name(ast_node);

   if (ast_node_instanceof_parallel && this.in_loop > 0) {
      this.lvl++;
   } else if (ast_node_instanceof_loop) {
      this.in_loop++;
   } else if (ast_node instanceof ast.LocalSignal && this.in_loop > 0) {
      this.lvl++;
      this.down_at_loop_out++;
   } else if (ast_node instanceof ast.Pause && this.lvl > 0) {
      ast_node.new_incarnation_on_k0 = true;
   } else if (ast_node_instanceof_trap) {
      this.trap_stack.push(ast_node.trap_name);
   }

   ast_node.incarnation = this.lvl;
   for (var i in ast_node.children)
      ast_node.children[i].accept(this);

   if (ast_node_instanceof_loop) {
      ast_node.in_loop--;
      this.lvl -= this.down_at_loop_out;
      this.down_at_loop_out = 0;
   } else if (ast_node_instanceof_parallel && this.in_loop > 0) {
      this.lvl--;
   } else if (ast_node_instanceof_trap) {
      this.trap_stack.pop();
   } else if (ast_node instanceof ast.Exit) {
      let offset = this.trap_stack.length
	  - this.trap_stack.indexOf(ast_node.trap_name) - 1;
      ast_node.return_code += offset;
   }
}

InitVisitor.prototype.check_name = function(ast_node) {
   var name = ast_node.signal_name || ast_node.trap_name;

   if (ast_node instanceof ast.Signal) {
      if (this.signal_names.indexOf(name) > -1)
	 throw new error.SyntaxError("Signal name `" + name + "` already used",
				     ast_node.loc)
      this.signal_names.push(name);
   } else if (ast_node instanceof ast.Trap) {
      if (this.trap_names.indexOf(name) > -1)
	 throw new error.SyntaxError("Trap name `" + name + "` already used",
				     ast_node.loc)
      this.trap_names.push(name);
   } else if (ast_node.signal_name) {
      if (this.signal_names.indexOf(name) == -1)
	 throw new error.SyntaxError("Unknown signal identifier `"
				     + name + "`", ast_node.loc)
   } else if (ast_node instanceof ast.Exit) {
      if (this.trap_names.indexOf(name) == -1)
	 throw new error.SyntaxError("Unknown trap identifier `"
				     + name + "`", ast_node.loc);
   }
}

function compile(machine, ast) {
   ast.accept(new InitVisitor(machine));
   ast.accept(new PrintTreeVisitor());
   ast.make_circuit();
   ast.accept_auto(new ConnectCircuitVisitor());
}

exports.compile = compile;
