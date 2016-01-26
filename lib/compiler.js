"use hopscript"

var ast = require("./ast.js");
var error = require("./error.js");
var net = require("./net.js");
var signal = require("./signal.js");

/* The object behind all `[sub]circuit*` variables in the source code */

function Interface(go, res, susp, kill, sel, k) {
   if (go)
      this.go = go instanceof Array ? go : [go];
   else
      this.go = [];

   if (res)
      this.res = res instanceof Array ? res : [res];
   else
      this.res = [];

   if (susp)
      this.susp = susp instanceof Array ? susp : [susp];
   else
      this.susp = [];

   if (kill)
      this.kill = kill instanceof Array ? kill : [kill];
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

/* Construction of circuit to access to a signal value and to test signal
   presence. `ast_node` is the node of the statement that use the signal.
   They return the K0 wire to plug on AND of conditional branch (for instance).
   Call theses function only after calling make_circuit() functions. */

function make_signal_access(ast_node, signal) {
}

function make_signal_test(ast_node, signal) {
   var k0;

   if(signal.emitters.length == 0) {
      k0 = new net.Register(ast_node);
   } else {
      k0 = net.makeOr(ast_node);
      for (let i in signal.emitters)
	 signal.emitters[i].ast_node.circuit.k[0].connect_to(k0, false)
   }
   return k0;
}

/* Construction function of circuit of each HipHop statement */

function make_present(ast_node, circuit_then, circuit_else) {
   var and_then = net.makeAnd(ast_node);
   var and_else = net.makeAnd(ast_node);

   var res = [];
   var susp = [];
   var kill = [];
   var sel = undefined;
   var k = [];

   /* connect K0 of presence test to GO of then and else branch */
   for (let i in circuit_then.go)
      and_then.connect_to(circuit_then.go[i], false)
   for (let i in circuit_else.go)
      and_else.connect_to(circuit_else.go[i], false)

   /* broadcast RES, SUSP and KILL to then and else branch */
   res = [].concat(circuit_then.res).concat(circuit_else.res);
   susp = [].concat(circuit_then.susp).concat(circuit_else.susp);
   kill = [].concat(circuit_then.kill).concat(circuit_else.kill);

   /* connect then and else branch SEL to present SEL */
   if (circuit_then.sel) {
      if (!sel)
	 sel = net.makeOr(ast_node);
      circuit_then.sel.connect_to(sel, false);
   }
   if (circuit_else.sel) {
      if (!sel)
	 sel = net.makeOr(ast_node);
      circuit_else.sel.connect_to(sel, false);
   }

   /* connect then and else branch K[i] to present K[i] */
   for (let i in circuit_then.k) {
      if (!k[i])
	 k[i] = net.makeOr(ast_node)
      circuit_then.k[i].connect_to(k[i], false);
   }
   for (let i in circuit_else.k) {
      if (!k[i])
	 k[i] = net.makeOr(ast_node)
      circuit_else.k[i].connect_to(k[i], false);
   }

   return new Interface([and_then, and_else], res, susp, kill, sel, k);
}

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
   var sel;
   var k = [];
   var seq_interface = new Interface([], [], [], [], sel, k)

   /* connect sequence GO to first stmt GO */
   for (let i in subcircuit[0].go)
      seq_interface.go.push(subcircuit[0].go[i]);

   for (let c = 0; c < len; c++) {
      let circuit = subcircuit[c];

      /* connect sequence RES, SUSP and KILL to stmts RES, SUSP and KILL */
      seq_interface.res = [].concat(seq_interface.res).concat(circuit.res);
      seq_interface.susp = [].concat(seq_interface.susp).concat(circuit.susp);
      seq_interface.kill = [].concat(seq_interface.kill).concat(circuit.kill);

      /* connect SEL stmt to SEL sequence */
      if (circuit.sel) {
	 if (!sel)
	    sel = net.makeOr(ast_node);
	 circuit.sel.connect_to(sel, false);
      }

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
   var go_or = net.makeOr(ast_node);

   /* Always send `0` value to K0 */
   var k = [ new net.Register(ast_node) ];

   for (let i in subcircuit.go)
      go_or.connect_to(subcircuit.go[i], false);
   for (let i = 1; i < subcircuit.length; i++)
      k[i] = subcircuit.k[i];
   subcircuit.k[0].connect_to(go_or, false);

   return new Interface(go_or, subcircuit.res, subcircuit.susp, subcircuit.kill,
			subcircuit.sel, k);
}

function make_emit(ast_node) {
   var emit;

   emit = new net.Emit(ast_node);
   ast_node.signal.add_emitter(ast_node, ast_node.callee || ast_node.args);
   return new Interface(emit, undefined, undefined, undefined, undefined, [emit]);
}

function make_nothing(ast_node) {
   var go = new net.Net(ast_node);
   return new Interface(go, undefined, undefined, undefined, undefined, [go]);
}

/* Recursive circuit construction */

ast.ASTNode.prototype.make_circuit = function(ast_node) {
   throw new error.InternalError("`make_circuit` must be implemented",
				 ast_node.loc)
}

ast.Module.prototype.make_circuit = function() {
   var first_circuit = null;

   this.machine.go = new net.Register(this);
   this.machine.res = new net.Register(this);
   this.machine.susp = new net.Register(this);
   this.machine.kill = new net.Register(this);

   for (let i in this.children) {
      let child = this.children[i];

      child.make_circuit();
      if (!first_circuit && !(child instanceof ast.Signal))
	 first_circuit = child.circuit;
   }

   if (first_circuit) {
      for (let i in first_circuit.go)
	 this.machine.go.connect_to(first_circuit.go[i], false)
      for (let i in first_circuit.res)
	 this.machine.res.connect_to(first_circuit.res[i], false);
      for (let i in first_circuit.susp)
	 this.machine.susp.connect_to(first_circuit.susp[i], false);
      for (let i in first_circuit.kill)
	 this.machine.kill.connect_to(first_circuit.kill[i], false);
   }
}

ast.Emit.prototype.make_circuit = function() {
   get_signal(this);
   this.circuit = make_emit(this)
}

ast.Pause.prototype.make_circuit = function() {
   this.circuit = make_pause(this);
}

ast.Nothing.prototype.make_circuit = function() {
   this.circuit = make_nothing(this);
}

ast.Sequence.prototype.make_circuit = function() {
   var subcircuit = [];

   for (let i in this.children) {
      this.children[i].make_circuit();
      subcircuit.push(this.children[i].circuit)
   }
   this.circuit = make_sequence(this, subcircuit);
}

ast.Present.prototype.make_circuit = function() {
   get_signal(this);
   this.children[0].make_circuit();
   this.children[1].make_circuit();
   this.circuit = make_present(this,
			       this.children[0].circuit,
			       this.children[1].circuit)
}

ast.Loop.prototype.make_circuit = function() {
   this.children[0].make_circuit();
   this.circuit = make_loop(this, this.children[0].circuit);
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
   if (ast_node instanceof ast.Present) {
      var emitters_deps = make_signal_test(ast_node, ast_node.signal)
      emitters_deps.connect_to(ast_node.circuit.go[0], false);
      emitters_deps.connect_to(ast_node.circuit.go[1], true);
   }
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
