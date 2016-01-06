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

function check_expressions(loc, func, exprs) {
   reactive.type_test(func, Function, loc);
   reactive.type_test(exprs, Array, loc);

   if (func && exprs) {
      if (func.length != exprs.length)
	 reactive.fatal_error("The arity of `func` is " + func.length
			      + " but the arity of `exprs` is "
			      + exprs.length + ".", loc)
   } else if (func) {
      if (func.length > 0)
	 reactive.fatal_error("The arity of `func` is " + func.length
			      + " but no expression is given.", loc);
   } else if (exprs) {
      if (exprs.length > 1)
	 reactive.fatal_error("Missing `func` callback, with needed arity of "
			      + exprs.length + ".", loc);
   }

}

function check_attributes(attrs, mandatory, optional) {
   /* Check if attributes contains properties properties in `mandatory` and
      in `optional`. It reject program if a mandatory field is not in attrs,
      or if a attrs field is not in mandatory or optional */

   if (!attrs)
      attrs = {};
   var loc = format_loc(attrs);

   for (var name in attrs) {
      if (name == "id" && mandatory && mandatory.indexOf("!id") > -1)
	 reactive.fatal_error("Can't set `id` field here.", loc);
      else if (name == "%location" || name == "id")
	 ;
      else if (mandatory && mandatory.indexOf(name) > -1)
	 ;
      else if (optional && optional.indexOf(name) > -1)
	 ;
      else
	 reactive.fatal_error("Unexpected attribute: `" + name + "`", loc);
   }

   for (var i in mandatory) {
      var name = mandatory[i];
      if (name[0] == "!")
	 ;
      else if (attrs[name] === undefined)
	 reactive.fatal_error("Expected attribute: `" + name + "`", loc);
   }

   return attrs;
}

function already_used_name_error(name, loc) {
   reactive.fatal_error("Name `" + name + "` already used.", loc);
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
	 reactive.fatal_error("Unknown instruction `" + children[i] + "`",
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

function parse_exprs(raw_exprs) {
   var exprs = [];

   if (raw_exprs != undefined) {
      if (raw_exprs instanceof Array)
	 for (var expr in raw_exprs)
	    exprs.push(parse_value(raw_exprs[expr]));
      else
	 exprs.push(parse_value(raw_exprs))
   }

   return exprs;
}

function EMIT(attrs) {
   var loc = format_loc(attrs);
   var exprs;
   var func;

   attrs = check_attributes(attrs, ["signal_name"], ["func", "exprs"]);
   exprs = parse_exprs(attrs.exprs);
   func = attrs.func;
   check_expressions(loc, func, exprs);
   for (var name in exprs) {
      var expr = exprs[name];

      if (expr instanceof reactive.SignalAccessor
	  && expr.signame == attrs.signal_name
	  && !expr.pre)
	 reactive.fatal_error("Can't get the value of " + attrs.signal_name
			      + " to update itself.", loc);
   }
   return new ast.Emit(attrs.id, loc, attrs.signal_name, func, exprs);
}

function SUSTAIN(attrs) {
   var loc = format_loc(attrs);
   var exprs;
   var func;

   attrs = check_attributes(attrs, ["signal_name"], ["func", "exprs"]);
   exprs = parse_exprs(attrs.exprs);
   func = attrs.func;
   check_expressions(loc, func, exprs);
   return new ast.Sustain(attrs.id, loc, attrs.signal_name, func, exprs);
}

function IF(attrs) {
   var loc = format_loc(attrs);
   var children = get_children(arguments);
   var func;
   var exprs;

   if (children.length < 1)
      reactive.fatal_error("`If` must have at leat one child.", loc);
   attrs = check_attributes(attrs, ["exprs"], ["func"]);
   exprs = parse_exprs(attrs.exprs);
   func = attrs.func;
   check_expressions(loc, func, exprs);
   return new ast.If(attrs.id,
		     loc,
   		     attrs.not != undefined,
   		     func,
   		     exprs,
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
   var loc = format_loc(attrs);
   var children = get_children(arguments);

   attrs = check_attributes(attrs, ["signal_name"], ["test_pre"]);
   if (children.length < 1)
      reactive.fatal_error("`Present` must have at least one child.", loc);
   return new ast.Present(attrs.id,
			  loc,
			  attrs.signal_name,
			  attrs.test_pre != undefined,
			  [ children[0], children[1] ]);
}

function AWAIT(attrs) {
   attrs = check_attributes(attrs,
			    ["signal_name"],
			    ["test_pre", "immediate", "count"]);
   return new ast.Await(attrs.id,
			format_loc(attrs),
			attrs.signal_name,
			attrs.test_pre != undefined,
			attrs.immediate != undefined,
			parse_count(attrs, attrs.count));
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
			    ["test_pre", "weak", "immediate", "count"]);
   return new ast.Abort(attrs.id,
			format_loc(attrs),
			attrs.signal_name,
			attrs.test_pre != undefined,
			attrs.immediate != undefined,
			attrs.weak != undefined,
			parse_count(attrs, attrs.count),
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
   return new ast.LoopEach(attrs.id,
			   format_loc(attrs),
			   implicit_sequence(attrs, get_children(arguments)),
			   attrs.signal_name,
			   attrs.test_pre != undefined,
			   parse_count(attrs, attrs.count));
}

function EVERY(attrs) {
   attrs = check_attributes(attrs, ["signal_name"], ["immediate", "count"]);
   return new ast.Every(attrs.id,
			format_loc(attrs),
			implicit_sequence(attrs, get_children(arguments)),
			attrs.signal_name,
			parse_count(attrs, attrs.count),
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
   var loc = format_loc(attrs);
   var exprs;
   var func;

   attrs = check_attributes(attrs, ["func"], ["exprs"]);
   exprs = parse_exprs(attrs.exprs);
   func = attrs.func;
   check_expressions(loc, func, exprs);
   return new ast.Atom(attrs.id, loc, func, exprs);
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
   var loc = format_loc(attrs);
   var ref;

   attrs = check_attributes(attrs,
			    ["!id", "name"],
			    ["type", "init_value", "combine_with", "valued" ]);
   ref = init_signal_declaration(attrs, loc);

   if (!(ref instanceof reactive.Signal))
      reactive.fatal_error("Invalid InputSignal declaration.", loc);
   return new ast.InputSignal(loc, ref);
}

function OUTPUTSIGNAL(attrs) {
   var loc = format_loc(attrs);
   var ref;
   var react_functions = [];

   attrs = check_attributes(attrs,
			    ["!id", "name"],
			    ["type", "react_functions", "init_value",
			     "combine_with", "valued" ]);
   ref = init_signal_declaration(attrs, loc);

   if (!(ref instanceof reactive.Signal))
      reactive.fatal_error("Invalid OutputSignal declaration.", loc);

   if (attrs.react_functions instanceof Function)
      react_functions.push(attrs.react_functions);
   else if (attrs.react_functions instanceof Array)
      for (func in attrs.react_functions)
	 if (attrs.react_functions[func] instanceof Function)
	    react_functions.push(attrs.react_functions[func])
   return new ast.OutputSignal(loc, ref, react_functions);
}

function init_signal_declaration(attrs, loc) {
   var ref = attrs.ref;
   var name = attrs.name;
   var type = attrs.type;
   var init_value = parse_value(attrs.init_value);
   var combine_with = attrs.combine_with;
   var valued = attrs.valued != undefined;

   reactive.type_test(combine_with, Function, loc);
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
   var loc = format_loc(attrs);
   var init_value;
   var valued;

   attrs = check_attributes(attrs,
			    ["!id", "name"],
			    ["type", "init_value", "combine_with", "valued" ]);
   reactive.type_test(attrs.combine_with, Function, loc);
   init_value = parse_value(attrs.init_value);
   valued = attrs.valued != undefined
      || attrs.type != undefined
      || attrs.combine_with != undefined
      || init_value != undefined;

   return new ast.LocalSignal(attrs.id,
			      loc,
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

function parse_count(attrs, count) {
   count = parse_value(count);
   if (count != undefined && (parseInt(count) != count || count < 0))
      reactive.fatal_error("Attribute `count` must be a positive integer.",
			   attrs.loc);
   return count;
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
