"use hopscript"

var ast = require("./ast.js");
var reactive = require("./reactive-kernel.js");
var compiler = require("./compiler.js");

function format_loc(attrs) {
   var loc = attrs != undefined ? attrs["%location"] : undefined;

   if (loc != undefined)
      return loc.filename + ":" + loc.pos;
   return "[LOC DISABLED --- run hop -g to get location]";
}

function get_children(args) {
   var children = [];
   var raw_children = Array.prototype.slice.call(args, 1, args.length);

   for (var i in raw_children)
      if (raw_children[i] instanceof ast.ASTNode)
	 children.push(raw_children[i]);
   return children;
}

function check_attributes(attrs, mandatory, optional) {
   /* Check if attributes contains properties properties in `mandatory` and
      in `optional`. It reject program if a mandatory field is not in attrs,
      or if a attrs field is not in mandatory or optional */

   if (!attrs)
      attrs = {};

   for (var name in attrs) {
      if (name == "id" && mandatory && mandatory.indexOf("!id") > -1)
	 reactive.fatal_error("Can't set `id` field here.", format_loc(attrs));
      else if (name == "%location" || name == "id")
	 ;
      else if (mandatory && mandatory.indexOf(name) > -1)
	 ;
      else if (optional && optional.indexOf(name) > -1)
	 ;
      else
	 reactive.fatal_error("Unexpected attribute: " + name,
			      format_loc(attrs));
   }

   for (var i in mandatory) {
      var name = mandatory[i];
      if (name[0] == "!")
	 ;
      else if (attrs[name] === undefined)
	 reactive.fatal_error("Expected attribute: " + name,
			      format_loc(attrs));
   }

   return attrs;
}

function already_used_name_error(name, loc) {
   reactive.fatal_error("Name " + name + " already used.", loc);
}

function REACTIVEMACHINE(attrs) {
   var children = get_children(arguments);
   var len = children.length;
   var ast_machine = null;
   var inputs = [];
   var outputs = [];
   var debug = attrs.debug == undefined ? false : true;

   if (!(children[len - 1] instanceof ast.Statement))
      reactive.fatal_error("ReactiveMachime last child must be a statement",
			   format_loc(attrs));
   var i = 0;
   var stmts;

   /* Get all interface signal declarations */
   while(children[i] instanceof ast.Signal) {
      var child = children[i];

      if (child instanceof ast.InputSignal) {
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
      i++;
   }

   /* Checks code following interface signal declaration is only
      regular statements */
   stmts = children.slice(i, children.length);
   for (; i < children.length; i++)
      if (!(children[i] instanceof ast.Statement)) {
	 if (children[i] instanceof ast.Signal)
	    reactive.fatal_error("Can't use innput/output signal declaration "
				 + "inside reactive  machine code.",
				 children[i].loc);
	 reactive.fatal_error("Unknown instruction " + children[i],
			      format_loc(attrs));
      }

   ast_machine = new ast.ReactiveMachine(format_loc(attrs),
				         attrs.name,
                                         debug,
				         inputs,
				         outputs,
				         implicit_sequence(attrs, stmts));
   return compiler.compile(ast_machine, undefined);
}

function parse_exprs(attrs) {
   var exprs = [];

   if (attrs.exprs != undefined) {
      if (attrs.exprs instanceof Array)
	 for (var expr in attrs.exprs)
	    exprs.push(parse_value(attrs.exprs[expr]));
      else
	 exprs.push(parse_value(attrs.exprs))
   }

   return exprs;
}

function EMIT(attrs) {
   attrs = check_attributes(attrs, ["signal_name"], ["func", "exprs"]);
   return new ast.Emit(attrs.id,
		       format_loc(attrs),
		       attrs.signal_name,
		       attrs.func,
		       parse_exprs(attrs));
}

function SUSTAIN(attrs) {
   attrs = check_attributes(attrs, ["signal_name"], ["func", "exprs"]);
   return new ast.Sustain(attrs.id,
			  format_loc(attrs),
			  attrs.signal_name,
			  attrs.func,
			  parse_exprs(attrs));
}

function IF(attrs) {
   attrs = check_attributes(attrs, ["exprs"], ["func"]);
   var children = get_children(arguments);

   return new ast.If(attrs.id,
		     format_loc(attrs),
   		     attrs.not != undefined,
   		     attrs.func,
   		     parse_exprs(attrs),
   		     [ children[0], children[1] ]);
}

function NOTHING(attrs) {
   attrs = check_attributes(attrs, undefined, undefined);
   return new ast.Nothing(attrs.id, format_loc(attrs));
}

function PAUSE(attrs) {
   attrs = check_attributes(attrs, undefined, undefined);
   return new ast.Pause(attrs.id, format_loc(attrs));
}

function HALT(attrs) {
   attrs = check_attributes(attrs, undefined, undefined);
   return new ast.Halt(attrs.id, format_loc(attrs));
}

function PRESENT(attrs) {
   var children = get_children(arguments);

   attrs = check_attributes(attrs, ["signal_name"], ["test_pre"]);
   if (children.length < 1)
      reactive.fatal_error("Present must have at least one child.",
			   format_loc(attrs));
   return new ast.Present(attrs.id,
			  format_loc(attrs),
			  attrs.signal_name,
			  attrs.test_pre != undefined,
			  [ children[0], children[1] ]);
}

function AWAIT(attrs) {
   attrs = check_attributes(attrs,
			    ["signal_name"],
			    ["test_pre", "immediate", "count"]);
   var count = parse_value(attrs.count);

   return new ast.Await(attrs.id,
			format_loc(attrs),
			attrs.signal_name,
			attrs.test_pre != undefined,
			attrs.immediate != undefined,
			typeof(count) == "number" ? count : 0);
}

function PARALLEL(attrs) {
   attrs = check_attributes(attrs, undefined, undefined);
   var children = get_children(arguments);

   if (children.length < 1)
      reactive.fatal_error("Parallel must have at least one child.",
			   format_loc(attrs));
   return new ast.Parallel(attrs.id, format_loc(attrs), children);
}

function ABORT(attrs) {
   attrs = check_attributes(attrs,
			    ["signal_name"],
			    ["test_pre", "immediate", "count"]);
   var count = parse_value(attrs.count)

   return new ast.Abort(attrs.id,
			format_loc(attrs),
			attrs.signal_name,
			attrs.test_pre != undefined,
			attrs.immediate != undefined,
			typeof(count) == "number" ? count : 0,
			implicit_sequence(attrs, get_children(arguments)));
}

function SUSPEND(attrs) {
   attrs = check_attributes(attrs, ["signal_name"], ["test_pre"]);
   return new ast.Suspend(attrs.id,
			  format_loc(attrs),
			  attrs.signal_name,
			  attrs.test_pre != undefined,
			  implicit_sequence(attrs, get_children(arguments)));
}

function LOOP(attrs) {
   attrs = check_attributes(attrs, undefined, undefined);
   return new ast.Loop(attrs.id,
		       format_loc(attrs),
		       implicit_sequence(attrs, get_children(arguments)));
}

function LOOPEACH(attrs) {
   attrs = check_attributes(attrs, ["signal_name"], ["test_pre", "count"]);
   var count = parse_value(attrs.count);
   var signame = attrs.signal_name;

   return new ast.LoopEach(attrs.id,
			   format_loc(attrs),
			   implicit_sequence(attrs, get_children(arguments)),
			   signame,
			   attrs.test_pre != undefined,
			   typeof(count) == "number" ? count : 0);
}

function EVERY(attrs) {
   attrs = check_attributes(attrs, ["signal_name"], ["immediate", "count"]);
   var count = parse_value(attrs.count);
   var signame = attrs.signal_name;

   return new ast.Every(attrs.id,
			format_loc(attrs),
			implicit_sequence(attrs, get_children(arguments)),
			signame,
			count,
			attrs.immediate != undefined)
}

function SEQUENCE(attrs) {
   var children = get_children(arguments);

   attrs = check_attributes(attrs, undefined, undefined);
   if (children.length < 2)
      reactive.fatal_error("Sequence must have at least two children.",
			   format_loc(attrs));
   return new ast.Sequence(attrs.id, format_loc(attrs), children);
}

function ATOM(attrs) {
   attrs = check_attributes(attrs, ["func"], ["exprs"]);
   var func = attrs.func;

   if (!(func instanceof Function))
      reactive.fatal_error("Atom must have a func attribute which is "
			   + "a function.", format_loc(attrs));
   return new ast.Atom(attrs.id,
		       format_loc(attrs),
		       attrs.func,
		       parse_exprs(attrs));
}

function TRAP(attrs) {
   check_attributes(attrs, ["trap_name"], undefined);
   return new ast.Trap(attrs.id,
		       format_loc(attrs),
		       attrs.trap_name,
		       implicit_sequence(attrs, get_children(arguments)));
}

function EXIT(attrs) {
   check_attributes(attrs, ["trap_name"], undefined);
   return new ast.Exit(attrs.id, format_loc(attrs), attrs.trap_name);
}

function INPUTSIGNAL(attrs) {
   attrs = check_attributes(attrs,
			    ["!id", "name"],
			    ["type", "init_value", "combine_with", "valued" ]);
   var ref = init_signal_declaration(attrs);

   if (!(ref instanceof reactive.Signal))
      reactive.fatal_error("Invalid InputSignal declaration.",
			   format_loc(attrs));
   return new ast.InputSignal(format_loc(attrs), ref);
}

function OUTPUTSIGNAL(attrs) {
   attrs = check_attributes(attrs,
			    ["!id", "name"],
			    ["type", "react_functions", "init_value",
			     "combine_with", "valued" ]);
   var ref = init_signal_declaration(attrs);

   if (!(ref instanceof reactive.Signal))
      reactive.fatal_error("OutputSignal must had a ref argument as signal.",
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
   var valued = attrs.valued != undefined;

   if (type != undefined
       || valued
       || combine_with != undefined
       || init_value != undefined)
      valued = true;

   if (ref == undefined && name != undefined) {
      if (valued)
	 ref = new reactive.ValuedSignal(name, type, init_value, combine_with,
					 undefined);
      else
	 ref = new reactive.Signal(name, undefined);
   }

   return ref;
}

function LOCALSIGNAL(attrs) {
   attrs = check_attributes(attrs,
			    ["!id", "name"],
			    ["type", "init_value", "combine_with", "valued" ]);

   var init_value = parse_value(attrs.init_value);
   var valued = attrs.valued != undefined
       || attrs.type != undefined
       || attrs.combine_with != undefined
       || init_value != undefined;

   return new ast.LocalSignal(attrs.id,
			      format_loc(attrs),
			      attrs.name,
			      implicit_sequence(attrs, get_children(arguments)),
			      attrs.type,
			      init_value,
			      attrs.combine_with,
			      valued);
}

function RUN(attrs) {
   attrs = check_attributes(attrs, ["machine", "sigs_assoc"], undefined);
   var run_machine = attrs.machine;
   var sigs_assoc = attrs.sigs_assoc;
   var sigs_assoc_len = Object.keys(sigs_assoc).length;
   var run_machine_siglen = (Object.keys(run_machine.input_signals).length
			     + Object.keys(run_machine.output_signals).length);

   if(!(run_machine instanceof reactive.ReactiveMachine))
      reactive.fatal_error("Run::machine must be a ReactiveMachine.",
			   format_loc(attrs));

   if (sigs_assoc_len != run_machine_siglen)
      reactive.fatal_error("Bad mapping signals [given:"
			   + sigs_assoc_len + " excepted:"
			   + run_machine_siglen + "]",
			   format_loc(attrs));

   for (var i in run_machine.input_signals)
      if (sigs_assoc[i] == undefined)
	 reactive.fatal_error("Signal " + i + " not mapped.",
			      format_loc(attrs));

   for (var i in run_machine.output_signals)
      if (sigs_assoc[i] == undefined)
	 reactive.fatal_error("Signal " + i + " not mapped.",
			      format_loc(attrs));

   return new ast.Run(attrs.id,
		      format_loc(attrs),
		      run_machine.go_in.stmt_out.get_ast_node(),
		      sigs_assoc);
}

function parse_value(value) {
   if (typeof(value) == "string") {
      try {
	 value = JSON.parse(value);
      } catch (e) {
	 if (value[0] == "{" && value[value.length - 1] == "}")
	    reactive.catchable_error("Failed to parse JSON", undefined);
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
   }
   return value;
}

function implicit_sequence(attrs, children) {
   if (children.length == 1)
      return children;
   return new ast.Sequence(undefined, format_loc(attrs), children);
}

exports.REACTIVEMACHINE = REACTIVEMACHINE;
exports.EMIT = EMIT;
exports.SUSTAIN = SUSTAIN;
exports.NOTHING = NOTHING;
exports.PAUSE = PAUSE;
exports.HALT = HALT;
exports.PRESENT = PRESENT;
exports.AWAIT = AWAIT;
exports.PARALLEL = PARALLEL;
exports.ABORT = ABORT;
exports.LOOP = LOOP;
exports.LOOPEACH = LOOPEACH;
exports.SEQUENCE = SEQUENCE;
exports.ATOM = ATOM;
exports.SUSPEND = SUSPEND;
exports.TRAP = TRAP;
exports.EXIT = EXIT;
exports.LOCALSIGNAL = LOCALSIGNAL;
exports.INPUTSIGNAL = INPUTSIGNAL;
exports.OUTPUTSIGNAL = OUTPUTSIGNAL;
exports.RUN = RUN;
exports.IF = IF;
exports.EVERY = EVERY;
exports.parse_value = parse_value;
