"use hopscript"

var ast = require("./ast.js");
var reactive = require("./reactive-kernel.js");
var compiler = require("./compiler.js");

function format_loc(attrs) {
   var loc = attrs != undefined ? attrs["%location"] : undefined;

   if (loc != undefined)
      return loc.filename + ":" + loc.pos;
   return "[LOC DISABLED]";
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
   var auto_react = 0;
   var inputs = [];
   var outputs = [];
   var debug = attrs.debug == undefined ? false : true;

   if (!(children[len - 1] instanceof ast.Statement))
      fatal("ReactiveMachime last child must be a statement",
	    format_loc(attrs));

   if (attrs.auto_react != undefined) {
      auto_react = parseInt(attrs.auto_react);
      if (isNaN(auto_react))
	 fatal("ReactiveMachine::auto_react must be integer",
	       format_loc(attrs));
      if (auto_react <= 0)
	 console.log("WARNING: auto reaction of reactive machine", attrs.name,
		     "is inhibited");
   }

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
                                         auto_react,
                                         debug,
				         inputs,
				         outputs,
				         children[len - 1]);
   return compiler.compile(ast_machine);
}

function EMIT(attrs) {
   var loc = format_loc(attrs);
   var expr = attrs.expr;

   if (expr != undefined && !(expr instanceof reactive.Expression))
      /* Need to parse_value if a litteral is given as
	 expression, becauseXML parser will convert it
	 in string. */
      expr = new reactive.BoxingExpression(loc, parse_value(attrs.expr));
   check_signal_name(attrs.signal_name, attrs);
   return new ast.Emit(loc, attrs.signal_name, expr);
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
   var ref = init_signal_declaration(attrs);

   if (!(ref instanceof reactive.Signal))
      fatal("Invalid InputSignal declaration.", format_loc(attrs));

   return new ast.InputSignal(format_loc(attrs), ref);
}

function OUTPUTSIGNAL(attrs) {
   var ref = init_signal_declaration(attrs);

   if (!(ref instanceof reactive.Signal))
      fatal("OutputSignal must had a ref argument as signal.",
	    format_loc(attrs));
   var react_functions = [];

   if (attrs.react_functions instanceof Function)
      react_functions.push(attrs.react_functions);
   else if (attrs.react_functions instanceof Array)
      for (func in attrs.react_functions)
	 if (attrs.react_functions[func] instanceof Function)
	    react_functions.push(attrs.react_functions[func])
   return new ast.OutputSignal(format_loc(attrs), ref, react_functions);
}

function init_signal_declaration(attrs) {
   var ref = attrs.ref;
   var name = attrs.name;
   var type = attrs.type;
   var init_value = parse_value(attrs.init_value);
   var combine_with = attrs.combine_with;

   if (ref == undefined && name != undefined) {
      if (type != undefined)
	 ref = new reactive.ValuedSignal(name, type, init_value, combine_with,
					 undefined);
      else
	 ref = new reactive.Signal(name);
   }

   return ref;
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

/* attrs.pre get the state of a signal
   attrs.value get the value (the compiler must checks if the signal
   is actually a valued signal */

function SIGEXPR(attrs) {
   return new reactive.SignalExpression(format_loc(attrs),
					attrs.signal_name,
					attrs.get_pre != undefined,
					attrs.get_value != undefined);
}

function EXPR(attrs) {
   var loc = format_loc(attrs);
   var exprs = [];

   for (var i in attrs.exprs) {
      if (!(attrs.exprs[i] instanceof reactive.Expression))
	 exprs[i] = new reactive.BoxingExpression(loc, attrs.exprs[i]);
      else
	 exprs[i] = attrs.exprs[i];
   }
   return new reactive.Expression(loc, attrs.func, exprs)
}

function RUN(attrs) {
   var run_machine = attrs.machine;
   var sigs_assoc = attrs.sigs_assoc;
   var sigs_assoc_len = Object.keys(sigs_assoc).length;
   var run_machine_siglen = (Object.keys(run_machine.input_signals).length
			     + Object.keys(run_machine.output_signals).length);

   if(!(run_machine instanceof reactive.ReactiveMachine))
      fatal("Run::machine must be a ReactiveMachine.", format_loc(attrs));

   if (sigs_assoc_len != run_machine_siglen)
      fatal("Bad mapping signals [given:"
	    + sigs_assoc_len + " excepted:" + run_machine_siglen + "]",
	    format_loc(attrs));

   for (var i in run_machine.input_signals)
      if (sigs_assoc[i] == undefined)
	 fatal("Signal " + i + " not mapped.", format_loc(attrs));

   for (var i in run_machine.output_signals)
      if (sigs_assoc[i] == undefined)
	 fatal("Signal " + i + " not mapped.", format_loc(attrs));

   return new ast.Run(format_loc(attrs),
		      run_machine.go_in.stmt_out.get_ast_node(),
		      sigs_assoc);
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
exports.EXPR = EXPR;
exports.SIGEXPR = SIGEXPR;
exports.RUN = RUN;
exports.parse_value = parse_value;
