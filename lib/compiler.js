"use hopscript"

const ast = require("./ast.js");
const error = require("./error.js");
const net = require("./net.js");

/* TODO:
   - change name of local signal / traps on RUN
   - detect statically a instantaneous loop
*/

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
	 error.InternalError("assert `k` instanceof Array failed", undefined);
      this.k = k;
   } else
      this.k = [];
}

/* generic function to connect dependencies of expressions */
function connect_expression_dependencies(gate, ast_node) {
   if (ast_node.args && ast_node.args.length > 0)
      for (let i in ast_node.args[i]) {
	 let arg = ast_node.args[i];

	 if (arg instanceof net.SignalAccessor && !arg.get_pre) {
	    let sig = get_signal(ast_node, arg.signal_name);

	    sig.connect_to(gate,
			   arg.get_value
			   ? net.CONNECT.ALWAYS_TRUE
			   : net.CONNECT.STATE);
	 }
      }
}

/* Construction function of circuit of each HipHop statement */

function make_present(ast_node, circuit_then, circuit_else) {
   var and_then = net.make_and(ast_node);
   var and_else = net.make_and(ast_node);

   var res;
   var susp;
   var kill;
   var sel;
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
	 sel = net.make_or(ast_node);
      circuit_then.sel.connect_to(sel, false);
   }
   if (circuit_else.sel) {
      if (!sel)
	 sel = net.make_or(ast_node);
      circuit_else.sel.connect_to(sel, false);
   }

   /* connect then and else branch K[i] to present K[i] */
   for (let i in circuit_then.k) {
      if (!k[i])
	 k[i] = net.make_or(ast_node)
      circuit_then.k[i].connect_to(k[i], false);
   }
   for (let i in circuit_else.k) {
      if (!k[i])
	 k[i] = net.make_or(ast_node)
      circuit_else.k[i].connect_to(k[i], false);
   }

   /* connect dependencies of test */
   var sig = get_signal(ast_node, this.signal_name);

   sig.connect_to(and_then, net.CONNECT.STATE);
   sig.connect_to(and_else, net.CONNECT.NET_STATE);

   return new Interface([and_then, and_else], res, susp, kill, sel, k);
}

function make_pause(ast_node) {
   var wire1 = new net.Net(ast_node);
   var and1 = net.make_and(ast_node);
   var or1 = net.make_or(ast_node);
   var and2 = net.make_and(ast_node);
   var reg = new net.Register(ast_node);
   var and3 = net.make_and(ast_node);
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
   var go = [];
   var res = [];
   var susp = [];
   var kill = [];
   var sel;
   var k = [];

   /* connect sequence GO to first stmt GO */
   for (let i in subcircuit[0].go)
      go.push(subcircuit[0].go[i]);

   for (let c = 0; c < len; c++) {
      let circuit = subcircuit[c];

      /* connect sequence RES, SUSP and KILL to stmts RES, SUSP and KILL */
      res = res.concat(circuit.res);
      susp = susp.concat(circuit.susp);
      kill = kill.concat(circuit.kill);

      /* connect SEL stmt to SEL sequence */
      if (circuit.sel) {
	 if (!sel)
	    sel = net.make_or(ast_node);
	 circuit.sel.connect_to(sel, false);
      }

      /* connect stmts K[i>0] to sequence K[i>0] */
      for (let i = 1; i < circuit.k.length; i++) {
	 if (!k[i])
	    k[i] = net.make_or(ast_node);
	 circuit.k[i].connect_to(k[i], false);
      }

      /* connect K0 of previous stmt to GO of following stmt */
      if (c + 1 < len)
	 for (let i in subcircuit[c + 1].go)
	    circuit.k[0].connect_to(subcircuit[c + 1].go[i], false);
   }

   /* connect last stmt K0 to sequence K0 */
   k[0] = subcircuit[len - 1].k[0];

   return new Interface(go, res, susp, kill, sel, k);
}

function make_parallel(ast_node, circuit_left, circuit_right) {
   var go;
   var res;
   var susp;
   var kill;
   var sel;
   var k = [];

   var lem = net.make_nor(ast_node);
   var rem = net.make_nor(ast_node);
   var k_left;
   var k_right;

   var static_k_max = Math.max(circuit_left.k.length, circuit_right.k.length);

   /* broadcast GO, RES, SUSP and KILL on branches */
   go = [].concat(circuit_left.go).concat(circuit_right.go);
   res = [].concat(circuit_left.res).concat(circuit_right.res);
   susp = [].concat(circuit_left.susp).concat(circuit_right.susp);
   kill = [].concat(circuit_left.kill).concat(circuit_right.kill);

   go.push(lem);
   go.push(rem);

   /* get SEL of branches */
   if (circuit_left.sel) {
      if (!sel)
	 sel = net.make_or(ast_node);
      circuit_left.sel.connect_to(sel, false);
      circuit_left.sel.connect_to(lem, false);
   }

   if (circuit_right.sel) {
      if (!sel)
	 sel = net.make_or(ast_node);
      circuit_right.sel.connect_to(sel, false);
      circuit_right.sel.connect_to(rem, false);
   }

   /* get the K of branches */
   k_left = [].concat(circuit_left.k);
   k_right = [].concat(circuit_right.k);

   /* max constructive circuit */
   for (let i = 0; i < static_k_max; i++) {
      let k_or = net.make_or(ast_node);
      let k_and = net.make_and(ast_node);

      k[i] = k_and;
      k_or.connect_to(k_and, false);

      let l_or = net.make_or(ast_node);
      let r_or = net.make_or(ast_node);

      lem.connect_to(l_or, false)
      if (circuit_left.k[i]) {
	 circuit_left.k[i].connect_to(l_or, false);
	 circuit_left.k[i].connect_to(k_or, false);
      }

      rem.connect_to(r_or, false)
      if (circuit_right.k[i]) {
	 circuit_right.k[i].connect_to(r_or, false);
	 circuit_right.k[i].connect_to(k_or, false);
      }

      l_or.connect_to(k_and, false);
      r_or.connect_to(k_and, false);

      lem = l_or;
      rem = r_or;
   }

   return new Interface(go, res, susp, kill, sel, k);
}

function make_abort(ast_node, subcircuit) {
   var and1 = net.make_and(ast_node);
   var and2 = net.make_and(ast_node);
   var and3 = net.make_and(ast_node);
   var or = net.make_or(ast_node);

   var go = subcircuit.go;
   var res = and1;
   var susp = subcircuit.susp;
   var kill = subcircuit.kill;
   var sel = subcircuit.sel;
   var k = [ or ];

   ast_node.store_dependencies();

   and1.connect_to(and2, false);
   and1.connect_to(and3, false);
   and3.connect_to(or, false);
   if (subcircuit.sel)
      subcircuit.sel.connect_to(and1, false)
   subcircuit.k[0].connect_to(or, false);

   for (let i in subcircuit.res)
      and2.connect_to(subcircuit.res[i], false);
   for (let i = 1; i < subcircuit.k.length; i++)
      k[i] = subcircuit.k[i];

   /* connect dependencies */
   var sig = get_signal(ast_node, this.signal_name);

   sig.connect_to(and2, net.CONNECT.NEG_STATE);
   sig.connect_to(and3, net.CONNECT.STATE);

   return new Interface(go, res, susp, kill, sel, k);
}

function make_trap(ast_node, subcircuit) {
   var go = subcircuit.go;
   var res = subcircuit.res;
   var susp = subcircuit.susp;
   var kill = net.make_or(ast_node);
   var sel = subcircuit.sel;
   var k = [ net.make_or(ast_node) ];

   for (let i in subcircuit.kill)
      kill.connect_to(subcircuit.kill[i], false)

   subcircuit.k[0].connect_to(k[0], false);

   /* We make this test in case of trap statement without any exit inside it */
   if (subcircuit.k[2]) {
      subcircuit.k[2].connect_to(kill, false);
      subcircuit.k[2].connect_to(k[0], false);
   }

   k[1] = subcircuit.k[1];
   for (let i = 3; i < subcircuit.k.length; i++)
      k[i - 1] = subcircuit.k[i];
   return new Interface(go, res, susp, kill, sel, k);
}

function make_exit(ast_node) {
   var wire = new net.Net(ast_node);
   var k = [];

   /* CHECKIT: propage `0` on sequence instruction under exit */
   for (let i = 0; i < ast_node.return_code; i++)
      k[i] = new net.Register(ast_node);
   k[ast_node.return_code] = wire;
   return new Interface(wire, undefined, undefined, undefined, undefined, k,
			undefined);
}

function make_loop(ast_node, subcircuit) {
   var go_or = net.make_or(ast_node);

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
   var sig = get_signal(ast_node, ast_node.signal_name);;
   var emit = new net.Emit(ast_node, sig);

   sig.emitters++;
   emit.connect_to(sig, net.CONNECT.STATE);
   connect_expression_dependencies(emit, ast_node);

   return new Interface(emit, undefined, undefined, undefined, undefined,
			[emit]);
}

function make_nothing(ast_node) {
   var go = new net.Net(ast_node);
   return new Interface(go, undefined, undefined, undefined, undefined, [go]);
}

function make_halt(ast_node) {
   return make_loop(ast_node, make_pause(ast_node));
}

function make_await(ast_node) {
   return make_abort(ast_node, make_halt(ast_node));
}

function make_atom(ast_node) {
   var atom = new net.Atom(ast_node);

   connect_expression_dependencies(atom, ast_node);
   return new Interface(atom, undefined, undefined, undefined, undefined,
			[atom]);
}

/* Recursive circuit construction */

ast.Module.prototype.make_circuit = function() {
   var first_circuit = null;

   this.machine.go = new net.Register(this);
   this.machine.res = new net.Register(this);
   this.machine.susp = new net.Register(this);
   this.machine.kill = new net.Register(this);

   for (let i in this.children) {
      let child = this.children[i];

      child.make_circuit();
      if (!first_circuit && !(child instanceof ast.InputSignal
			      || child instanceof ast.OutputSignal))
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

ast.Parallel.prototype.make_circuit = function() {
   function _make_parallel(ast_node, branches) {
      let len = branches.length;

      if (len == 1)
	 return make_parallel(ast_node, branches[0], make_nothing(ast_node));
      else if (len == 2)
	 return make_parallel(ast_node, branches[0], branches[1]);
      else if (len % 2 == 0)
	 return make_parallel(ast_node,
			      _make_parallel(ast_node,
					     branches.slice(0, len / 2)),
			      _make_parallel(ast_node,
					     branches.slice(len / 2 + 1, len)));
      else
	 return make_parallel(ast_node,
			      branches[0],
			      _make_parallel(ast_node, branches.slice(1, len)))
   }

   var subcircuit = [];

   for (let i in this.children) {
      this.children[i].make_circuit();
      subcircuit.push(this.children[i].circuit);
   }
   this.circuit = _make_parallel(this, subcircuit);
}

ast.Abort.prototype.make_circuit = function() {
   this.children[0].make_circuit();
   this.circuit = make_abort(this, this.children[0].circuit);
}

ast.Trap.prototype.make_circuit = function() {
   this.children[0].make_circuit();
   this.circuit = make_trap(this, this.children[0].circuit);
}

ast.Exit.prototype.make_circuit = function() {
   this.circuit = make_exit(this);
}

ast.Halt.prototype.make_circuit = function() {
   this.circuit = make_halt(this);
}

ast.Await.prototype.make_circuit = function() {
   this.circuit = make_await(this);
}

ast.Atom.prototype.make_circuit = function() {
   this.circuit = make_atom(this);
}

/* Signal instantiation and assignation on machine and ast node that use them */

function instantiate_signal(ast_node, input) {
   if (ast_node.valued)
      return new net.ValuedSignal(ast_node,
				  ast_node.signal_name,
				  input,
				  ast_node.combine_with,
				  ast_node.init_value,
				  ast_node.type);
   return new net.Signal(ast_node, ast_node.signal_name, input);
}

function get_signal(ast_node, name) {
   var machine = ast_node.machine;

   return machine.input_signals[name]
      || machine.output_signals[name]
      || machine.local_signals[name];
}

exports.get_signal = get_signal;

ast.LocalSignal.prototype.make_circuit = function() {
   this.machine.local_signals[this.signal_name] =
      instantiate_signal(this, true);
   this.children[0].make_circuit();
   this.circuit = this.children[0].circuit;

   var reset_signal = new net.Net(this);

   for (let i in this.circuit.go)
      reset_signal.connect_to(this.circuit.go[i], false)

   reset_signal.action = function() {
      if (!this.state)
	 return
      let sig = get_signal(this.ast_node, this.ast_node.signal_name);
      s.reset(true);
   }
   this.circuit.go = [reset_signal];
}

ast.InputSignal.prototype.make_circuit = function() {
   this.machine.input_signals[this.signal_name] =
      instantiate_signal(this, true);
}

ast.OutputSignal.prototype.make_circuit = function() {
   this.machine.output_signals[this.signal_name] =
      instantiate_signal(this, false);
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
   console.log(buf, " [parent:", buf_parent + "]");

   var prev_indent = this.indent;

   this.indent = this.INDENT_UNIT + this.indent;
   for (var i in node.children)
      node.children[i].accept(this);
   this.indent = prev_indent;
}

/* This visitor initialize the AST with the machine which own it,
   compule trap exit code, and check names */

function InitVisitor(machine) {
   this.machine = machine;

   /* check name data */
   this.trap_names = [];
   this.signal_names = [];

   /* trap data */
   this.trap_stack = [];
}

InitVisitor.prototype.visit = function(ast_node) {
   var ast_node_instanceof_trap = ast_node instanceof ast.Trap;

   ast_node.machine = this.machine;
   this.check_name(ast_node);

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
}

exports.compile = compile;
