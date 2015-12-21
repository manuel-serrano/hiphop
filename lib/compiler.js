"use hopscript"

var ast = require("./ast.js");
var reactive = require("./reactive-kernel.js");

function format_loc(attrs) {
   return attrs["%location"].filename + ":" + attrs["%location"].pos;
}

function already_used_name_error(name, loc) {
   reactive.fatal_error("Name " + name + " already used.", loc);
}

function unknown_name_error(name, loc) {
   reactive.fatal_error("Name " + name + " is not known.", loc);
}

function BuildTreeVisitor(ast_machine) {
   this.ast_machine = ast_machine;
   this.parent = null;
}

BuildTreeVisitor.prototype.visit = function(node) {
   node.parent = this.parent;
   node.ast_machine = this.ast_machine;

   if (node instanceof ast.Run)
      node.accept_auto(new MapNameRunVisitor(this.ast_machine,
					     node.sigs_assoc));
   if (node instanceof ast.Circuit) {
      for (var i in node.subcircuit) {
	 this.parent = node;
	 node.subcircuit[i].accept(this);
      }
      this.parent = node.parent;
   }
}

/* This visitor is used to map signal of the caller reactive machine to
   the callee reactive machine, and must be use only on the sub-ast of
   the callee */

function MapNameRunVisitor(ast_machine, sigs_assoc) {
   this.ast_machine = ast_machine;

   /* If the key is found as signal_name, replace it in
      ast nodes by the value. Same things for trap_name */
   this.sigs_assoc = sigs_assoc;
   this.traps_assoc = {};
}

MapNameRunVisitor.prototype.visit = function(node) {
   if (node.signal_name != undefined) {
      var name = node.signal_name;

      if (this.sigs_assoc[name] != undefined)
	 node.signal_name = this.sigs_assoc[name];
   }
}

/* This visitor must be called *after* CheckNamesVisitor : it checks if in
   any Run sub-ast, a local signal / trap definition has a name already
   somewhere in the caller circuit.
   If yes, it change the name in the sub (callee) circuit.
   In any cases, it add the defined name in the sub circuit on global
   ast_machine names, in case that this name could be use on sub circuit
   of others run statement. */

function RemoveNameConflictRunVisitor(ast_machine) {
   this.locals = ast_machine.local_signals;
   this.traps = ast_machine.trap_names;
   this.switch_locals = {};
   this.switch_traps = {};
   this.prefix;
   this.in_run = false;
}

RemoveNameConflictRunVisitor.prototype.visit = function(node) {
   var name;

   if (node instanceof ast.Run) {
      /* New prefix for conflicts local/trap name for each callee */
      this.prefix = String(Math.random()).substring(2);

      /* As the runtime dosen't know RUN statement, as as the callee machine
	 is always a runtime machine, we can't have explicit nested run
	 statement (so we don't have to keep a run-context) */
      this.in_run = true;
   }

   if (this.in_run) {
      if (node instanceof ast.LocalSignal) {
	 name = node.signal_name;
	 if (this.locals.indexOf(name) > -1) {
	    this.switch_locals[name] = this.prefix + "__" + name;
	    node.signal_name = this.switch_locals[name];
	 }
	 this.locals.push(this.switch_locals[name]);
      } else if (node instanceof ast.Trap) {
	 name = node.trap_name;
	 if (this.traps.indexOf(name) > -1) {
	    this.switch_traps[name] = this.prefix + "__" + name;
	    node.trap_name = this.switch_traps[name];
	 }
	 this.traps.push(this.switch_traps[name]);
      } else if (node.signal_name != undefined) {
	 name = node.signal_name;
	 if (this.switch_locals[name] != undefined)
	    node.signal_name = this.switch_locals[name];
      } else if (node.trap_name != undefined) {
	 name = node.trap_name;
	 if (this.switch_traps[name] != undefined)
	    node.trap_name = this.switch_traps[name];
      }
   }

   if (node instanceof ast.Circuit) {
      for (var i in node.subcircuit)
	 node.subcircuit[i].accept(this);
      this.in_run = false;
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
   this.ast_machine = ast_machine;
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
   if (node instanceof ast.Run)
      return;
   if (node instanceof ast.LocalSignal) {
      if (this.declared_name(node.signal_name))
	 already_used_name_error(node.signal_name, node.loc);
      this.locals.push(node.signal_name);

      /* usefull only for RunVisitor */
      this.ast_machine.local_signals.push(node.signal_name);
   } else if (node instanceof ast.Trap) {
      if (this.declared_name(node.trap_name))
	 already_used_name_error(node.trap_name, node.loc);
      this.traps.push(node.trap_name);

      /* usefull only for RunVisitor */
      this.ast_machine.trap_names.push(node.trap_name);
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

   if (node instanceof ast.Circuit)
      for (var i in node.subcircuit)
	 node.subcircuit[i].accept(this);
}

function SetIncarnationLevelVisitor() {
   this.in_loop = 0;
   this.lvl = 0;
   this.down_at_loop_out = 0;
}

SetIncarnationLevelVisitor.prototype.visit = function(node) {
   if (node instanceof ast.Circuit) {
      var node_is_loop = false;
      var node_must_incr = false;

      if (node instanceof ast.Parallel && this.in_loop > 0) {
	 this.lvl++;
	 node_must_incr = true;
      } else if (node instanceof ast.Loop) {
	 this.in_loop++;
	 node_is_loop = true;
      } else if (node instanceof ast.LocalSignal && this.in_loop > 0) {
	 this.lvl++;
	 this.down_at_loop_out++;
      }

      node.incarnation_lvl = this.lvl;
      for (var i in node.subcircuit) {
	 node.subcircuit[i].accept(this);
      }

      if (node_is_loop) {
	 this.in_loop--;
	 this.lvl -= this.down_at_loop_out;
	 this.down_at_loop_out = 0;
      }

      if (node_must_incr)
	 this.lvl--;
   } else if (node instanceof ast.Statement) {
      node.incarnation_lvl = this.lvl;
      if (node instanceof ast.Pause && node.incarnation_lvl > 0)
	 node.k0_on_depth = true;
   } else
      reactive.fatal_error("Inconsitant state", node.loc);
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

      /* Happen when the visitor is called on already existing reactive machine
	 in the case of the use add local signals after build it */
      if (sigs[name] != undefined)
	 return;

      sigs[name] = [];
      if (node.type != undefined) {
	 for (var i = 0; i < node.incarnation_lvl + 1; i++)
	    sigs[name][i] = new reactive.ValuedSignal(name,
						      node.type,
						      node.init_value,
						      node.combine_with,
						      this.machine);
      } else {
	 for (var i = 0; i < node.incarnation_lvl + 1; i++)
	    sigs[name][i] = new reactive.Signal(name, this.machine);
      }
   }
}

function BuildCircuitVisitor(machine) {
   this.machine = machine;
   this.children_stack = [];
}

BuildCircuitVisitor.prototype.visit = function(node) {
   if (!(node instanceof ast.Statement))
      reactive.fatal_error("Inconsistence state: node not a circuit/statement.",
			   node.loc);

   if (node instanceof ast.ReactiveMachine) {
      node.subcircuit[0].accept(this);
      this.machine.build_wires(this.children_stack.pop());
      if (this.children_stack.length != 0)
	 reactive.fatal_error("children_stack has " + this.children_stack.length
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

function CheckIdVisitor(machine) {
   this.used_name = []
}

CheckIdVisitor.prototype.visit = function(node) {
   if (node.id != undefined) {
      if (this.used_name.indexOf(node.id) == -1)
	 this.used_name.push(node.id);
      else
	 reactive.fatal_error("Id " + node.id + " already used", node.loc)
   }
}

/* Set machine attribute to SignalAccessor used in the expressions */

function ExpressionVisitor(machine) {
   this.machine = machine;
}

ExpressionVisitor.prototype.set_machine = function(node) {
   for (var name in node.exprs) {
      var expr = node.exprs[name];

      if (expr instanceof reactive.SignalAccessor)
	 expr.machine = this.machine;
   }
}

ExpressionVisitor.prototype.visit = function(node) {
   if (node instanceof ast.Emit) {
      this.set_machine(node);
      if (node.exprs.length > 1 && node.func == undefined)
	 reactive.fatal_error("Emit must have func attribute set if it had "
			      + "more than one expression.", node.loc);
      for (var i in node.exprs)
	 if (node.exprs[i] instanceof reactive.SignalAccessor
	     && node.exprs[i].signame == node.signal_name
	     && !node.exprs[i].pre)
	    reactive.fatal_error("Can't get the value of " + node.signal_name
				 + " to update itself.", node.loc);
   } else if (node instanceof ast.If) {
      this.set_machine(node);
      if (node.exprs.length > 1 && node.func == undefined)
	 reactive.fatal_error("If must have func attribute set if it had "
			      + "more than one expression.", node.loc);
      else if (node.exprs.length == 1 && node.func == undefined) {
	 if (!(node.exprs[0] instanceof reactive.SignalAccessor)
	     && typeof(node.exprs[0]) != "boolean")
	    reactive.fatal_error("If must have a boolean expression if it had "
				 + "not func argument", node.loc);
	 /* not very esay to chech the type of the signal here, so we leave it
	    to runtime, if exprs[0] is a signalaccessor... */
      }
   } else if (node instanceof ast.Atom) {
      this.set_machine(node);
      if ((node.exprs != undefined && node.exprs.length != node.func.length)
	  || (node.func.length > 0 && node.exprs == undefined))
	 reactive.fatal_error("The arity of Atom statement callback ("
			      + node.func.length + ") must be equal to the "
			      + "number of exprs ("
			      + node.exprs.length + ").", node.loc);
   } else if (node instanceof ast.Abort || node instanceof ast.Await) {
      if (node.count < 0)
	 reactive.fatal_error("count attribute can't be negative", node.loc)
   }
}

/* Take the root of an AST (that must be ReactiveMachine node)
   and then return a reactive program (a runnable reactive machine).

   At the call of this function, the ast_machine must have its inputs/outputs
   signals defined, an checked (not the same name more than one time) */

function compile(ast_machine, machine) {
   if (!(ast_machine instanceof ast.ReactiveMachine))
      reactive.fatal_error("compile must take a ast.ReactiveMachine argument.");

   if (machine == undefined) {
      machine = new reactive.ReactiveMachine(ast_machine.loc,
					     ast_machine.machine_name,
					     ast_machine.debug);

      for (var i in ast_machine.input_signals) {
	 var sig = ast_machine.input_signals[i];
	 machine.input_signals[sig.signal_ref.name] = sig.signal_ref;
	 sig.signal_ref.machine = machine;
      }

      for (var i in ast_machine.output_signals) {
	 var sig = ast_machine.output_signals[i];
	 machine.output_signals[sig.signal_ref.name] = sig.signal_ref;
	 sig.signal_ref.machine = machine;
	 sig.signal_ref.react_functions = sig.react_functions;
      }
   } else {
      /* Invalidate previous AST if this is not the initial compilation of
	 the machine */
      machine.ast = null;
   }

   ast_machine.accept(new BuildTreeVisitor(ast_machine));
   ast_machine.accept(new CheckNamesVisitor(ast_machine));
   ast_machine.accept(new RemoveNameConflictRunVisitor(ast_machine));
   ast_machine.accept(new SetIncarnationLevelVisitor());
   ast_machine.accept(new SetExitReturnCodeVisitor());
   ast_machine.accept_auto(new SetLocalSignalsVisitor(machine));
   ast_machine.accept_auto(new ExpressionVisitor(machine));
   ast_machine.accept_auto(new CheckIdVisitor(machine));
   //ast_machine.accept(new PrintTreeVisitor());
   ast_machine.accept(new BuildCircuitVisitor(machine));

   return machine;
}

exports.compile = compile;
exports.BuildTreeVisitor = BuildTreeVisitor;
exports.PrintTreeVisitor = PrintTreeVisitor;
