"use hopscript"

/* TODO: CheckNamesVisitor: detect if we use a trap name for a signal */

var ast = require("./ast.js");
var reactive = require("./reactive-kernel.js");

function format_loc(attrs) {
   return attrs["%location"].filename + ":" + attrs["%location"].pos;
}

function get_children(args) {
   var children = [];
   var raw_children = Array.prototype.slice.call(args, 1, args.length);

   for (var i in raw_children)
      if (raw_children[i] instanceof ast.ASTNode)
	 children.push(raw_children[i]);
   return children;
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

function check_signal_name(signal_name, attrs) {
   if (typeof(signal_name) != 'string' || signal_name.length <= 0)
      fatal("signal_name not a string.", format_loc(attrs));
}

function check_trap_name(trap_name, attrs) {
   if (typeof(trap_name) != 'string' || trap_name.length <= 0)
      fatal("trap_name not a string.", format_loc(attrs));
}

function REACTIVEMACHINE(attrs) {
   var children = get_children(arguments);
   var len = children.length;
   var ast_machine = null;
   var machine = new reactive.ReactiveMachine(format_loc(attrs), attrs.name);
   var inputs = [];
   var outputs = [];
   var sig_names = [];

   if (!(children[len - 1] instanceof ast.Statement))
      fatal("ReactiveMachime last child must be a statement",
	    format_loc(attrs));

   for (var i = 0; i < len - 1; i++) {
      var child = children[i];

      if (!(child instanceof ast.Signal))
	 fatal("ReactiveMachine child " + i
	       + " is not an input or output signal.", format_loc(attrs));
      else if (child instanceof ast.InputSignal) {
	 if (sig_names.indexOf(child.signal_ref.name) > -1)
	    already_used_name_error(child.signal_ref.name, format_loc(attrs));
	 inputs.push(child);
	 machine.input_signals[child.signal_ref.name] = child.signal_ref;
	 sig_names.push(child.signal_ref.name);
      } else {
	 if (sig_names.indexOf(child.signal_ref.name) > -1)
	    already_used_name_error(child.signal_ref.name, format_loc(attrs));
	 outputs.push(child);
	 machine.output_signals[child.signal_ref.name] = child.signal_ref;
	 sig_names.push(child.signal_ref.name);
      }
   }

   ast_machine = new ast.ReactiveMachine(format_loc(attrs),
				     attrs.name,
				     inputs,
				     outputs,
				     children[len - 1]);
   ast_machine.accept(new BuildTreeVisitor(ast_machine));
   ast_machine.accept_auto(new CheckNamesVisitor(sig_names));
   ast_machine.accept(new SetIncarnationLevelVisitor());
   ast_machine.accept(new SetExitReturnCodeVisitor());
   ast_machine.accept_auto(new SetLocalSignalsVisitor(machine));
// ast_machine.accept(new PrintTreeVisitor(ast_machine));
   ast_machine.accept(new BuildCircuitVisitor(machine));
   return machine;
}

function EMIT(attrs) {
   check_signal_name(attrs.signal_name, attrs);
   return new ast.Emit(format_loc(attrs), attrs.signal_name);
}

function NOTHING(attrs) {
   return new ast.Nothing(format_loc(attrs));
}

function PAUSE(attrs) {
   return new ast.Pause(format_loc(attrs));
}

function HALT(attrs) {
   return new ast.Halt(format_loc(attrs));
}

function PRESENT(attrs) {
   var children = get_children(arguments);

   check_signal_name(attrs.signal_name, attrs);
   if (children.length < 1)
      fatal("Present must have at least one child.", format_loc(attrs));
   return new ast.Present(format_loc(attrs),
			  attrs.signal_name,
			  [ children[0], children[1] ]);
}

function AWAIT(attrs) {
   check_signal_name(attrs.signal_name, attrs);
   return new ast.Await(format_loc(attrs), attrs.signal_name);
}

function PARALLEL(attrs) {
   var children = get_children(arguments);

   if (children.length != 2)
      fatal("Parallel must have exactly two children.", format_loc(attrs));
   return new ast.Parallel(format_loc(attrs), [ children[0], children[1] ]);
}

function ABORT(attrs) {
   var children = get_children(arguments);

   check_signal_name(attrs.signal_name, attrs);
   if (children.length != 1)
      fatal("Abort must have exactly one child.", format_loc(attrs));
   return new ast.Abort(format_loc(attrs), attrs.signal_name, children[0]);
}

function SUSPEND(attrs) {
   var children = get_children(arguments);

   check_signal_name(attrs.signal_name, attrs);
   if (children.length != 1)
      fatal("Suspend must have exactly one child.", format_loc(attrs));
   return new ast.Suspend(format_loc(attrs), attrs.signal_name, children[0]);
}

function LOOP(attrs) {
   var children = get_children(arguments);

   if (children.length != 1)
      fatal("Loop must have exaclty one child.", format_loc(attrs));
   return new ast.Loop(format_loc(attrs), children[0]);
}

function SEQUENCE(attrs) {
   var children = get_children(arguments);

   if (children.length < 2)
      fatal("Sequence must have at least two children.", format_loc(attrs));
   return new ast.Sequence(format_loc(attrs), children);
}

function ATOM(attrs) {
   var func = attrs.func;

   if (!(func instanceof Function))
      fatal("Atom must have a func attribute which is a function.",
	    format_loc(attrs));
   return new ast.Atom(format_loc(attrs), attrs.func);
}

function TRAP(attrs) {
   var children = get_children(arguments);

   check_trap_name(attrs.trap_name, attrs);
   if (children.length != 1)
      fatal("Trap must embeded one child.", format_loc(attrs));
   return new ast.Trap(format_loc(attrs), attrs.trap_name, children[0]);
}

function EXIT(attrs) {
   check_trap_name(attrs.trap_name, attrs);
   return new ast.Exit(format_loc(attrs), attrs.trap_name);
}

function INPUTSIGNAL(attrs) {
   if (!(attrs.ref instanceof reactive.Signal))
      fatal("InputSignal must had a ref argument as signal.",
	    format_loc(attrs));
   return new ast.InputSignal(format_loc(attrs), attrs.ref);
}

function OUTPUTSIGNAL(attrs) {
   if (!(attrs.ref instanceof reactive.Signal))
      fatal("OutputSignal must had a ref argument as signal.",
	    format_loc(attrs));
   return new ast.OutputSignal(format_loc(attrs), attrs.ref);
}

function LOCALSIGNAL(attrs) {
   var children = get_children(arguments);

   check_signal_name(attrs.signal_name, attrs);
   if (children.length != 1)
      fatal("LocalSignalIdentifier must have only one statement child.",
	    format_loc(attrs));
   return new ast.LocalSignal(format_loc(attrs),
			      attrs.signal_name,
			      children[0]);
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

function CheckNamesVisitor(used_names) {
   this.used_names = used_names;
}

CheckNamesVisitor.prototype.visit = function(node) {
   if (node instanceof ast.LocalSignal) {
      if (this.used_names.indexOf(node.signal_name) > -1)
	 already_used_name_error(node.signal_name, node.loc);
      this.used_names.push(node.signal_name);
   } else if (node instanceof ast.Trap) {
      if (this.used_names.indexOf(node.trap_name) > -1)
	 already_used_name_error(node.trap_name, node.loc);
      this.used_names.push(node.trap_name);
   } else if (node instanceof ast.Exit) {
      if (this.used_names.indexOf(node.trap_name) < 0)
	 unknown_name_error(node.trap_name, node.loc);
   } else if (node instanceof ast.Emit
	      || node instanceof ast.Await
	      || node instanceof ast.Abort
	      || node instanceof ast.Suspend
	      || node instanceof ast.Present)
      if (this.used_names.indexOf(node.signal_name) < 0)
	 unknown_name_error(node.signal_name, node.loc);
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
      node.return_code = 2 + offset;
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
      for (var i = 0; i < node.incarnation_lvl + 1; i++) {
	 sigs[name][i] = new reactive.Signal(name, false);
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

exports.REACTIVEMACHINE = REACTIVEMACHINE;
exports.EMIT = EMIT;
exports.NOTHING = NOTHING;
exports.PAUSE = PAUSE;
exports.HALT = HALT;
exports.PRESENT = PRESENT;
exports.AWAIT = AWAIT;
exports.PARALLEL = PARALLEL;
exports.ABORT = ABORT;
exports.LOOP = LOOP;
exports.SEQUENCE = SEQUENCE;
exports.ATOM = ATOM;
exports.SUSPEND = SUSPEND;
exports.TRAP = TRAP;
exports.EXIT = EXIT;
exports.LOCALSIGNAL = LOCALSIGNAL;
exports.INPUTSIGNAL = INPUTSIGNAL;
exports.OUTPUTSIGNAL = OUTPUTSIGNAL;
