"use hopscript"

var ast = require("./ast.js");
var reactive = require("./reactive-kernel.js");
var compiler = require("./compiler.js");

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
   var inputs = [];
   var outputs = [];

   if (!(children[len - 1] instanceof ast.Statement))
      fatal("ReactiveMachime last child must be a statement",
	    format_loc(attrs));

   for (var i = 0; i < len - 1; i++) {
      var child = children[i];

      if (!(child instanceof ast.Signal))
	 fatal("ReactiveMachine child " + i
	       + " is not an input or output signal.", format_loc(attrs));
      else if (child instanceof ast.InputSignal) {
	 if (inputs.indexOf(child.signal_ref.name) > -1
	     || outputs.indexOf(child.signal_ref.name) > -1)
	    already_used_name_error(child.signal_ref.name, format_loc(attrs));
	 inputs.push(child);
      } else {
	 if (inputs.indexOf(child.signal_ref.name) > -1
	     || outputs.indexOf(child.signal_ref.name) > -1)
	    already_used_name_error(child.signal_ref.name, format_loc(attrs));
	 outputs.push(child);
      }
   }

   ast_machine = new ast.ReactiveMachine(format_loc(attrs),
				     attrs.name,
				     inputs,
				     outputs,
				     children[len - 1]);
   return compiler.compile(ast_machine);
}

function EMIT(attrs) {
   check_signal_name(attrs.signal_name, attrs);
   return new ast.Emit(format_loc(attrs), attrs.signal_name, attrs.expr);
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
			  attrs.test_pre != undefined,
			  [ children[0], children[1] ]);
}

function AWAIT(attrs) {
   check_signal_name(attrs.signal_name, attrs);
   return new ast.Await(format_loc(attrs),
			attrs.signal_name,
			attrs.test_pre != undefined);
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
   return new ast.Abort(format_loc(attrs),
			attrs.signal_name,
			attrs.test_pre != undefined,
			children[0]);
}

function SUSPEND(attrs) {
   var children = get_children(arguments);

   check_signal_name(attrs.signal_name, attrs);
   if (children.length != 1)
      fatal("Suspend must have exactly one child.", format_loc(attrs));
   return new ast.Suspend(format_loc(attrs),
			  attrs.signal_name,
			  attrs.test_pre != undefined,
			  children[0]);
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
			      children[0],
			      attrs.type,
			      parse_value(attrs.init_value),
			      attrs.combine_with);
}

function CONSTEXPR(attrs) {
   return new reactive.ConstExpression(null,
				       format_loc(attrs),
				       parse_value(attrs.value));
}

/* attrs.pre get the state of a signal
   attrs.value get the value (the compiler must checks if the signal
   is actually a valued signal */

function SIGEXPR(attrs) {
   return new reactive.SignalExpression(null,
					format_loc(attrs),
					attrs.signal_name,
					attrs.get_pre != undefined,
					attrs.get_value != undefined);
}

function PLUSEXPR(attrs) {
   return new reactive.PlusExpression(null,
				      format_loc(attrs),
				      attrs.expr1,
				      attrs.expr2);
}

function MINUSEXPR(attrs) {
   return new reactive.MinusExpression(null,
				       format_loc(attrs),
				       attrs.expr1,
				       attrs.expr2);
}

function parse_value(value) {
   if (typeof(value) == "string") {
      var raw_value = value.toLowerCase().trim();

      if (raw_value == "true") {
	 value = true;
      } else if (raw_value == "false") {
	 value = false;
      } else {
	 var num = Number(raw_value);

	 if (!isNaN(num)) {
	    value = num;
	 }
      }
   }
   return value;
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
exports.CONSTEXPR = CONSTEXPR;
exports.SIGEXPR = SIGEXPR;
exports.PLUSEXPR = PLUSEXPR;
exports.MINUSEXPR = MINUSEXPR;
