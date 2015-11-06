"use hopscript"

var ast = require("./ast.js");
var reactive = require("./reactive-kernel.js");

function format_loc(attrs) {
   return attrs["%location"].filename + ":" + attrs["%location"].pos;
}

function fatal(msg, pos) {
   console.log("*** ERROR at", pos, "***");
   console.log("   ", msg);
   process.exit(1);
}

function already_used_name_error(name, loc) {
   fatal("Name " + name + " already used.", loc);
}

function unknown_name_error(name, loc) {
   fatal("Name " + name + " is not known.", loc);
}

function BuildTreeVisitor(machine) {
   this.machine = machine;
   this.parent = null;
}

BuildTreeVisitor.prototype.visit = function(node) {
   node.parent = this.parent;
   node.machine = this.machine;

   if (node instanceof ast.Circuit)
      for (var i in node.subcircuit) {
	 this.parent = node;
	 node.subcircuit[i].accept(this);
      }
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
       || node instanceof ast.LocalSignal)
      buf = buf + " " + node.signal_name;
   else if (node instanceof ast.Trap)
      buf = buf + " " + node.trap_name;
   else if (node instanceof ast.Exit)
      buf = buf + " " + node.trap_name + " " + node.return_code;

   console.log(buf
	       + " [parent: "
	       + buf_parent
	       + " / lvl: "
	       + node.incarnation_lvl + "]");

   if (node instanceof ast.Circuit) {
      var prev_indent = this.indent;

      this.indent = this.INDENT_UNIT + this.indent;
      for (var i in node.subcircuit)
	 node.subcircuit[i].accept(this);
      this.indent = prev_indent;
   }
}

function CheckNamesVisitor(ast_machine) {
   this.inputs = [];
   this.outputs = [];
   this.traps = [];
   this.locals = [];

   for (var i in ast_machine.input_signals)
      this.inputs.push(ast_machine.input_signals[i].signal_ref.name);

   for (var i in ast_machine.output_signals)
      this.outputs.push(ast_machine.output_signals[i].signal_ref.name);
}

CheckNamesVisitor.prototype.declared_name = function(name) {
   return this.inputs.indexOf(name) > -1
       || this.outputs.indexOf(name) > -1
       || this.traps.indexOf(name) > -1
       || this.locals.indexOf(name) > -1
}

CheckNamesVisitor.prototype.declared_name_trap = function(name) {
   return this.traps.indexOf(name) > -1
}

CheckNamesVisitor.prototype.declared_name_signal = function(name) {
   return this.inputs.indexOf(name) > -1
      || this.outputs.indexOf(name) > -1
      || this.locals.indexOf(name) > -1
}

CheckNamesVisitor.prototype.visit = function(node) {
   if (node instanceof ast.LocalSignal) {
      if (this.declared_name(node.signal_name))
	 already_used_name_error(node.signal_name, node.loc);
      this.locals.push(node.signal_name);
   } else if (node instanceof ast.Trap) {
      if (this.declared_name(node.trap_name))
	 already_used_name_error(node.trap_name, node.loc);
      this.traps.push(node.trap_name);
   } else if (node instanceof ast.Exit) {
      if (!this.declared_name_trap(node.trap_name))
	 unknown_name_error("trap::" + node.trap_name, node.loc);
   } else if (node instanceof ast.Emit
	      || node instanceof ast.Await
	      || node instanceof ast.Abort
	      || node instanceof ast.Suspend
	      || node instanceof ast.Present)
      if (!this.declared_name_signal(node.signal_name))
	 unknown_name_error("signal::" + node.signal_name, node.loc);
}

function SetIncarnationLevelVisitor() {
   this.in_loop = 0;
   this.lvl = 0;
}

SetIncarnationLevelVisitor.prototype.visit = function(node) {
   if (node instanceof ast.Circuit) {
      var node_is_loop = false;
      var node_must_incr = false;

      if ((node instanceof ast.LocalSignal
	   || node instanceof ast.Parallel)
	  && this.in_loop > 0) {
	 this.lvl++;
	 node_must_incr = true;
      } else if (node instanceof ast.Loop) {
	 this.in_loop++;
	 node_is_loop = true;
      }

      node.incarnation_lvl = this.lvl;
      for (var i in node.subcircuit) {
	 node.subcircuit[i].accept(this);
      }

      if (node_is_loop)
	 this.in_loop--;

      if (node_must_incr)
	 this.lvl--;
   } else if (node instanceof ast.Statement) {
      node.incarnation_lvl = this.lvl;
      if (node instanceof ast.Pause && node.incarnation_lvl > 0)
	 node.k0_on_depth = true;
   } else
      fatal("Inconsitant state", node.loc);
}

function SetExitReturnCodeVisitor() {
   this.trap_stack = [];
}

SetExitReturnCodeVisitor.prototype.visit = function(node) {
   if (node instanceof ast.Circuit) {
      var is_trap = false;

      if (node instanceof ast.Trap) {
	 this.trap_stack.push(node.trap_name);
	 is_trap = true;
      }

      for (var i in node.subcircuit)
	 node.subcircuit[i].accept(this);

      if (is_trap)
	 this.trap_stack.pop();
   } else if (node instanceof ast.Exit) {
      var offset = this.trap_stack.length
	  - this.trap_stack.indexOf(node.trap_name) - 1;
      node.return_code += offset;
   }
}

function SetLocalSignalsVisitor(machine) {
   this.machine = machine;
}

SetLocalSignalsVisitor.prototype.visit = function(node) {
   if (node instanceof ast.LocalSignal) {
      var name = node.signal_name;
      var sigs = this.machine.local_signals;
      sigs[name] = [];

      if (this.valued_type != undefined) {
	 for (var i = 0; i < node.incarnation_lvl + 1; i++)
	    sigs[name][i] = new reactive.ValuedSignal(name,
						      this.type,
						      this.combine_with,
						      this.init_value);
      } else {
	 for (var i = 0; i < node.incarnation_lvl + 1; i++)
	    sigs[name][i] = new reactive.Signal(name);
      }
   }
}

function BuildCircuitVisitor(machine) {
   this.machine = machine;
   this.children_stack = [];
}

BuildCircuitVisitor.prototype.visit = function(node) {
   if (!(node instanceof ast.Statement))
      fatal("Inconsistence state: node not a circuit/statement.", node.loc);

   if (node instanceof ast.ReactiveMachine) {
      node.subcircuit[0].accept(this);
      this.machine.build_wires(this.children_stack.pop());
      if (this.children_stack.length != 0)
	 fatal("children_stack has " + this.children_stack.length
	       + " elements.", node.loc);
   } else {
      node.machine = this.machine;

      if (node instanceof ast.Circuit) {
	 var subcircuit = [];

	 for (var i in node.subcircuit)
	    node.subcircuit[i].accept(this);

	 for (var i in node.subcircuit)
	    subcircuit.push(this.children_stack.pop());

	 subcircuit.reverse();
	 node.subcircuit = subcircuit;
      }
      this.children_stack.push(node.factory());
   }
}

/* Set machine attribute to expression and check types of the expressions */

function ExpressionVisitor(machine) {
   this.machine = machine;
}

ExpressionVisitor.prototype.visit = function(node) {
   if (node instanceof ast.Emit && node.expr != undefined) {
      node.expr.set_machine(this.machine);

      if (node.expr instanceof reactive.SignalExpression && node.get_value)
	 if (!(machine.get_signal(node.signal_name)
	       instanceof reactive.ValuedSignal))
	    fatal("Can't get value of non valued signal.", node.expr.loc);

      if (!node.expr.is_vald_type())
	 fatal("Invalid type of expression.", node.expr.loc);
   }
}

/* Take the root of an AST (that must be ReactiveMachine node)
   and then return a reactive program (a runnable reactive machine).

   At the call of this function, the ast_machine must have its inputs/outputs
   signals defined, an checked (not the same name more than one time) */

function compile(ast_machine) {
   if (!(ast_machine instanceof ast.ReactiveMachine))
      fatal("compile must take a ast.ReactiveMachine argument.", "N/A");

   var machine = new reactive.ReactiveMachine(ast_machine.loc,
					      ast_machine.machine_name);

   for (var i in ast_machine.input_signals) {
      var sig = ast_machine.input_signals[i];
      machine.input_signals[sig.signal_ref.name] = sig.signal_ref;
   }

   for (var i in ast_machine.output_signals) {
      var sig = ast_machine.output_signals[i];
      machine.output_signals[sig.signal_ref.name] = sig.signal_ref;
   }

   ast_machine.accept(new BuildTreeVisitor(ast_machine));
   ast_machine.accept_auto(new CheckNamesVisitor(ast_machine));
   ast_machine.accept(new SetIncarnationLevelVisitor());
   ast_machine.accept(new SetExitReturnCodeVisitor());
   ast_machine.accept_auto(new SetLocalSignalsVisitor(machine));
   ast_machine.accept_auto(new ExpressionVisitor(machine));
// ast_machine.accept(new PrintTreeVisitor(ast_machine));
   ast_machine.accept(new BuildCircuitVisitor(machine));
   return machine;
}

exports.compile = compile;
