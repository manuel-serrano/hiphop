"use hopscript"

const ast = require("./ast.js");
const error = require("./error.js");

/* Check and prepare attributes for action nodes */
function check_action_node(loc, attrs, mandatory=true) {
   attrs.args = parse_args(attrs.args);
   check_func_args_list(loc, attrs.func, attrs.args);

   if (mandatory && (!attrs.func && attrs.args.length == 0))
      throw new error.SyntaxError("Missing expression.", loc);
}

/* Check and prepare attributes for expression nodes */
function check_expression_node(loc, attrs) {
   check_action_node(loc, attrs, false);
   let immediate = attrs.immediate;
   let valid_expr = attrs.func || attrs.args.length > 0;

   if (immediate)
      if (valid_expr)
	 throw new error.SyntaxError("Can't use `immediate` with expression.",
				     loc);

   /* If no expression is given, it must be a `signal_name` attribute
      to embed in an expression */
   if (!valid_expr) {
      check_signal_name(loc, attrs);
      attrs.args[0] = attrs.test_pre ?
	 presentPre(attrs.signal_name) :
	 present(attrs.signal_name);
   }
}

/* Check and prepare signal emission nodes (Emit and Sustain) */
function check_emit_node(loc, attrs) {
   check_action_node(loc, attrs, false);
   check_signal_name(loc, attrs);

   for (let name in attrs.args) {
      let arg = attrs.args[name];

      if (arg instanceof SignalAccessor
	  && arg.signal_name == attrs.signal_name
	  && !arg.get_pre)
	 throw new error.SignalError("Can't get current value of a signal to" +
				     " update itself.", attrs.signal_name, loc);
   }
}

/* Helper function that ensures that `args` list of expression is always
   an array */
function parse_args(raw_args) {
   let args = [];

   if (raw_args != undefined) {
      if (raw_args instanceof Array)
	 for (let expr in raw_args)
	    args.push(parse_value(raw_args[expr]));
      else
	 args.push(parse_value(raw_args))
   }

   return args;
}

/* Functon that checks and prepare attributes for CountExpressionNode */
function check_count_expression_node(loc, attrs) {
   check_expression_node(loc, attrs);
   check_func_args_list(loc, attrs.func_count, attrs.args_count);

   attrs.args_count = parse_args(attrs.args_count);
   attrs.count = parse_value(attrs.count);
   if (attrs.count != undefined &&
       (parseInt(attrs.count) != attrs.count || attrs.count < 0))
      throw new error.SyntaxError("Attribute `count` must be a positive" +
				  " integer.", attrs.loc);

   if (attrs.count && (attrs.func_count || attrs.args_count.length > 0))
      throw new error.SyntaxError("Can't use `count` and count expression.",
				  loc);

   if ((attrs.count || attrs.func_count || attrs.args_count.length > 0) &&
       attrs.immediate)
      throw new error.SyntaxError("Can't use `immediate` with count or " +
				  "count expression.", loc);

   if (attrs.count)
      attrs.args_count[0] = attrs.count;
}

/* Heler function that check if `func` is a Function, and if the arity of
   `args` is the same of the function */
function check_func_args_list(loc, func, args) {
   type_test(func, Function, loc);
   type_test(args, Array, loc);

   if (func && args) {
      if (func.length != args.length)
	 throw new error.SyntaxError("The arity of `func` is " + func.length +
				     " but the arity of `args` is " +
				     args.length + ".", loc)
   } else if (func) {
      if (func.length > 0)
	 throw new error.SyntaxError("The arity of `func` is " + func.length +
				     " but no expression is given.", loc);
   } else if (args) {
      if (args.length > 1)
	 throw new error.SyntaxError("Missing `func` callback, with needed" +
				     " arity of " + args.length + ".", loc);
   }
}

/* Helper function that checks if signal_name attribute is present
   and if it's a string */
function check_signal_name(loc, attrs) {
   let signame = attrs.signal_name;

   if (!signame)
      throw new error.SyntaxError("`signal_name` must be specified.", loc);
   type_test(signame, String, loc);
}

function format_loc(attrs) {
   let loc = attrs != undefined ? attrs["%location"] : undefined;

   if (loc != undefined)
      return loc.filename + ":" + loc.pos;
   return "[LOC DISABLED --- run hop -g to get location]";
}

/* Return childrens if any. Check bounds if > -1 */
function check_children(node_arguments, loc, min, max) {
   let raw_children = Array.prototype.slice.call(node_arguments, 1,
						 node_arguments.length);
   let children = [];

   for (let i in raw_children)
      if (raw_children[i] instanceof ast.ASTNode)
	 children.push(raw_children[i]);

   if (min > -1 && children.length < min)
      throw new error.SyntaxError("Missing children.", loc);

  if (max > -1 && children.length > max)
      throw new error.SyntaxError("Too much children.", loc);

   return children;
}

function check_no_children(node_arguments, loc) {
   check_children(node_arguments, loc, 0, 0);
}

function check_min_children(node_arguments, loc, min) {
   return check_children(node_arguments, loc, min, -1);
}

function parse_value(value) {
   if (typeof(value) == "string") {
      try {
	 value = JSON.parse(value);
      } catch (e) {
	 if (value[0] == "{" && value[value.length - 1] == "}")
	    reactive.catchable_error("Failed to parse JSON", undefined);
	 let raw_value = value.toLowerCase().trim();

	 if (raw_value == "true") {
	    value = true;
	 } else if (raw_value == "false") {
	    value = false;
	 } else {
	    let num = Number(raw_value);

	    if (!isNaN(num)) {
	       value = num;
	    }
	 }
      }
   }
   return value;
}

exports.parse_value = parse_value;

/* This function will likely be removed of rewritted. The goal is to check
   that a node has only allowed attributes. It's more or less useless since
   check_*_node functions. */
function check_attributes(attrs, mandatory, optional) {
   /* Check if attributes contains properties properties in `mandatory` and
      in `optional`. It reject program if a mandatory field is not in attrs,
      or if a attrs field is not in mandatory or optional */

   if (!attrs)
      attrs = {};
   let loc = format_loc(attrs);

   for (let name in attrs) {
      if (name == "id" && mandatory && mandatory.indexOf("!id") > -1)
	 throw new error.SyntaxError("Can't set `id` field here.", loc);
      else if (name == "%location" || name == "id")
	 ;
      else if (mandatory && mandatory.indexOf(name) > -1)
	 ;
      else if (optional && optional.indexOf(name) > -1)
	 ;
      else
	 throw new error.SyntaxError("Unexpected attribute: `" +
				     name + "`", loc);
   }

   for (let i in mandatory) {
      let name = mandatory[i];
      if (name[0] == "!")
	 ;
      else if (attrs[name] === undefined)
	 throw new error.SyntaxError("Expected attribute: `" + name + "`", loc);
   }

   return attrs;
}

function implicit_sequence(attrs, children) {
   if (children.length == 1)
      return children;
   return new ast.Sequence(undefined, format_loc(attrs), children);
}

function type_test(value, type, loc) {
   let wrong_type = false;

   if (value == undefined || value == null) {
      return;
   } else if (typeof(value) == "object" || typeof(value) == "function") {
      if (!(value instanceof type))
	 wrong_type = true;
   } else if (typeof(value) == "string" && type.name == "String") {
      return; /* !!!?????#546347635683?@#$34!  >< -_- :-( */
   } else if (typeof(value) != type)
      wrong_type = true;

   if (wrong_type) {
      let expected = type;
      let given = typeof(value);

      if (type instanceof Function)
	 expected = type.name;
      else if (type instanceof Object)
	 expected = type.constructor.name;
      if (value instanceof Object)
	 given = value.constructor.name;

      throw new error.TypeError(expected, given, loc);
   }
}

function MODULE(attrs) {
   attrs = check_attributes(attrs, undefined, undefined);
   let loc = format_loc(attrs);
   let children = check_children(arguments, loc, 1, -1);
   let inputs = [];
   let outputs = [];
   let i = 0;
   let j = 0;

   /* Get all interface signal declarations */
   while(children[i] instanceof ast.InputSignal
	 || children[i] instanceof ast.OutputSignal) {
      let child = children[i];

      if (child instanceof ast.InputSignal) {
	 if (inputs.indexOf(child.name) > -1
	     || outputs.indexOf(child.name) > -1)
	    throw new error.SyntaxError("Name of InputSignal `"	+ name +
					"` already used.", loc);
	 inputs.push(child);
      } else {
	 if (inputs.indexOf(child.name) > -1
	     || outputs.indexOf(child.name) > -1)
	    throw new error.SyntaxError("Name of OutputSignal `" + name +
					"` already used.", loc);
	 outputs.push(child);
      }
      i++;
   }

   /* Checks code following interface signal declaration is only
      regular statements */
   let stmts = children.slice(i, children.length);
   j = i;
   for (; i < children.length; i++)
      if (!(children[i] instanceof ast.ASTNode)) {
	 if (children[i] instanceof ast.Signal)
	    throw new error.SyntaxError("Can't use innput/output signal" +
					"declaration inside reactive" +
					" instruction code.",
					children[i].loc);
	 throw new error.SyntaxError("Unknown instruction `" + children[i] +
				     "`", format_loc(attrs));
      }

   children = children.slice(0, j);
   if (stmts.length > 1)
      children = children.concat(implicit_sequence(attrs, stmts));
   else
      children.push(stmts[0]);
   return new ast.Module(loc, children);
}

exports.MODULE = MODULE;

function EMIT(attrs) {
   let loc = format_loc(attrs);

   check_no_children(arguments, loc);
   attrs = check_attributes(attrs, ["signal_name"], ["func", "args"]);
   check_emit_node(loc, attrs);
   return new ast.Emit(attrs.id, loc, attrs.signal_name,
		       attrs.func, attrs.args);
}

exports.EMIT = EMIT;

function SUSTAIN(attrs) {
   let loc = format_loc(attrs);

   check_no_children(arguments, loc);
   attrs = check_attributes(attrs, ["signal_name"], ["func", "args"]);
   check_emit_node(loc, attrs);
   return new ast.Sustain(attrs.id, loc, attrs.signal_name, func, args);
}

exports.SUSTAIN = SUSTAIN;

function IF(attrs) {
   let loc = format_loc(attrs);
   let children = check_children(arguments, loc, 1, 2);

   attrs = check_attributes(attrs, ["args"], ["func", "not"]);
   check_expression_node(loc, attrs);
   return new ast.If(attrs.id,
		     loc,
		     [children[0], children[1]],
   		     attrs.not != undefined,
   		     attrs.func,
   		     attrs.args);
}

exports.IF = IF;

function PRESENT(attrs) {
   let loc = format_loc(attrs);
   let children = check_children(arguments, loc, 1, 2);

   attrs = check_attributes(attrs, ["signal_name"], ["test_pre", "not"]);
   check_expression_node(loc, attrs);
   return new ast.If(attrs.id,
		     loc,
		     [children[0], children[1]],
		     attrs.not != undefined,
		     undefined,
		     attrs.args)
}

exports.PRESENT = PRESENT;

function NOTHING(attrs) {
   let loc = format_loc(attrs);

   check_no_children(arguments, loc);
   attrs = check_attributes(attrs, undefined, undefined);
   return new ast.Nothing(attrs.id, loc);
}

exports.NOTHING = NOTHING;

function PAUSE(attrs) {
   let loc = format_loc(attrs);

   check_no_children(arguments, loc);
   attrs = check_attributes(attrs, undefined, undefined);
   return new ast.Pause(attrs.id, loc);
}

exports.PAUSE = PAUSE;

function HALT(attrs) {
   let loc = format_loc(attrs);

   check_no_children(arguments, loc);
   attrs = check_attributes(attrs, undefined, undefined);
   return new ast.Halt(attrs.id, loc);
}

exports.HALT = HALT;

function AWAIT(attrs) {
   let loc = format_loc(attrs);

   check_no_children(arguments, loc);
   attrs = check_attributes(attrs,
			    ["signal_name"],
			    ["test_pre", "immediate", "func", "args",
			     "args_count", "func_count"]);
   check_count_expression_node(loc, attrs);
   return new ast.Await(attrs.id,
			loc,
			attrs.func,
			attrs.args,
			attrs.immediate != undefined,
			attrs.func_count,
			attrs.args_count);
}

exports.AWAIT = AWAIT;

function PARALLEL(attrs) {
   let loc = format_loc(attrs);
   let children = check_min_children(arguments, loc, 1);

   attrs = check_attributes(attrs, undefined, undefined);
   return new ast.Parallel(attrs.id, loc, children);
}

exports.PARALLEL = PARALLEL;

function ABORT(attrs) {
   let loc = format_loc(attrs);
   let children = check_min_children(arguments, loc, 1);


   attrs = check_attributes(attrs, undefined,
			    ["signal_name", "test_pre", "immediate",
			     "func", "args",
			     "count", "func_count", "args_count"]);
   check_count_expression_node(loc, attrs);
   return new ast.Abort(attrs.id,
			loc,
			attrs.func,
			attrs.args,
			attrs.immediate != undefined,
			attrs.func_count,
			attrs.args_count,
			implicit_sequence(attrs, children));
}

exports.ABORT = ABORT;


function WEAKABORT(attrs) {
   let loc = format_loc(attrs);
   let children = check_min_children(arguments, loc, 1);


   attrs = check_attributes(attrs, undefined,
			    ["signal_name", "test_pre", "immediate",
			     "func", "args",
			     "count", "func_count", "args_count"]);
   check_count_expression_node(loc, attrs);
   return new ast.WeakAbort(attrs.id,
			loc,
			attrs.func,
			attrs.args,
			attrs.immediate != undefined,
			attrs.func_count,
			attrs.args_count,
			implicit_sequence(attrs, children));
}

exports.WEAKABORT = WEAKABORT;

function SUSPEND(attrs) {
   let loc = format_loc(attrs);
   let children = check_min_children(arguments, loc, 1);

   attrs = check_attributes(attrs, ["signal_name"], ["test_pre"]);
   check_expression_node(loc, attrs)
   return new ast.Suspend(attrs.id,
			  loc,
			  implicit_sequence(attrs, children),
			  attrs.func,
			  attrs.args,
			  attrs.immediate != undefined);
}

exports.SUSPEND = SUSPEND;

function LOOP(attrs) {
   let loc = format_loc(attrs);
   let children = check_min_children(arguments, loc, 1);

   attrs = check_attributes(attrs, undefined, undefined);
   return new ast.Loop(attrs.id, loc, implicit_sequence(attrs, children));
}

exports.LOOP = LOOP;

function LOOPEACH(attrs) {
   let loc = format_loc(attrs);
   let children = check_min_children(arguments, loc, 1);

   attrs = check_attributes(attrs, ["signal_name"], ["test_pre", "count"]);
   check_count_expression_node(loc, attrs);
   return new ast.LoopEach(attrs.id,
			   loc,
			   implicit_sequence(attrs, children),
			   attrs.func,
			   attrs.args,
			   attrs.immediate != undefined,
			   attrs.func_count,
			   attrs.args_count);
}

exports.LOOPEACH = LOOPEACH;

function EVERY(attrs) {
   let loc = format_loc(attrs);
   let children = check_min_children(arguments, loc, 1);

   attrs = check_attributes(attrs, ["signal_name"], ["immediate", "count"]);
   check_count_expression_node(loc, attrs);
   return new ast.Every(attrs.id,
			loc,
			implicit_sequence(attrs, children),
			attrs.func,
			attrs.args,
			attrs.immediate != undefined,
			attrs.func_count,
			attrs.args_count);
}

exports.EVERY = EVERY;

function SEQUENCE(attrs) {
   let loc = format_loc(attrs);
   let children = check_min_children(arguments, loc, 2);

   attrs = check_attributes(attrs, undefined, undefined);
   return new ast.Sequence(attrs.id, loc, children);
}

exports.SEQUENCE = SEQUENCE;

function ATOM(attrs) {
   let loc = format_loc(attrs);

   check_no_children(arguments, loc);
   attrs = check_attributes(attrs, ["func"], ["args"]);
   check_action_node(loc, attrs);
   return new ast.Atom(attrs.id, loc, attrs.func, attrs.args);
}

exports.ATOM = ATOM;

function TRAP(attrs) {
   let loc = format_loc(attrs);
   let children = check_min_children(arguments, loc, 1);

   check_attributes(attrs, ["trap_name"], undefined);
   return new ast.Trap(attrs.id, loc, attrs.trap_name,
		       implicit_sequence(attrs, children));
}

exports.TRAP = TRAP;

function EXIT(attrs) {
   let loc = format_loc(attrs);

   check_no_children(arguments, loc);
   check_attributes(attrs, ["trap_name"], undefined);
   return new ast.Exit(attrs.id, loc, attrs.trap_name);
}

exports.EXIT = EXIT;

function init_signal_declaration(attrs, loc, mandatory, optional) {
   attrs = check_attributes(attrs, mandatory, optional);
   let sigdecl = {};
   sigdecl.id = attrs.id;
   sigdecl.name = attrs.name;
   sigdecl.type = attrs.type;
   sigdecl.init_value = parse_value(attrs.init_value);
   sigdecl.combine_with = attrs.combine_with;
   sigdecl.valued = attrs.valued != undefined;

   type_test(sigdecl.combine_with, Function, loc);
   if (sigdecl.type != undefined
       || sigdecl.valued
       || sigdecl.combine_with != undefined
       || sigdecl.init_value != undefined)
      sigdecl.valued = true;

   return sigdecl;
}

function INPUTSIGNAL(attrs) {
   let loc = format_loc(attrs);
   let sigdecl = init_signal_declaration(attrs, loc, ["!id", "name"],
					 ["type", "init_value", "combine_with",
					  "valued"]);
   check_no_children(arguments, loc);
   return new ast.InputSignal(loc,
			      sigdecl.name,
			      sigdecl.type,
			      sigdecl.init_value,
			      sigdecl.combine_with,
			      sigdecl.valued);
}

exports.INPUTSIGNAL = INPUTSIGNAL;

function OUTPUTSIGNAL(attrs) {
   let loc = format_loc(attrs);
   let sigdecl = init_signal_declaration(attrs, loc, ["!id", "name"],
					 ["type", "init_value", "combine_with",
					  "valued"]);
   check_no_children(arguments, loc);
   return new ast.OutputSignal(loc,
			       sigdecl.name,
			       sigdecl.type,
			       sigdecl.init_value,
			       sigdecl.combine_with,
			       sigdecl.valued);
}

exports.OUTPUTSIGNAL = OUTPUTSIGNAL;

function LOCALSIGNAL(attrs) {
   let loc = format_loc(attrs);
   let children = check_min_children(arguments, loc, 1);
   let sigdecl = init_signal_declaration(attrs, loc, ["name"], ["id",
								"type",
								"init_value",
								"combine_with",
								"valued"]);

   return new ast.LocalSignal(sigdecl.id,
			      loc,
			      sigdecl.name,
			      implicit_sequence(attrs, children),
			      sigdecl.type,
			      sigdecl.init_value,
			      sigdecl.combine_with,
			      sigdecl.valued);
}

exports.LOCALSIGNAL = LOCALSIGNAL;

function RUN(attrs) {
   attrs = check_attributes(attrs, ["module", "sigs_assoc"], undefined);
   let loc = format_loc(attrs);
   let run_module = attrs.module.clone();
   let sigs_assoc = attrs.sigs_assoc;
   let sigs_assoc_len = Object.keys(sigs_assoc).length;

   check_no_children(arguments, loc);
   if(!(run_module instanceof reactive.Module))
      error.SyntaxError("`module` must be an instanceof HipHop.js Module.", loc)

   for (let i in run_module.children) {
      let stmt = run_module.children[i];

      if (!(stmt instanceof ast.InputSignal) ||
	  !(stmt instanceof ast.OutputSignal))
	 break;

      if (sigs_assoc[stmt.signal_name] == undefined)
	 error.SyntaxError("Signal " + stmt.signal_name + " not mapped.", loc)
   }

   return new ast.Run(attrs.id,
		      format_loc(attrs),
		      implicit_sequence(attrs, run_module.children.slice(i)),
		      sigs_assoc);
}

exports.RUN = RUN;

function SignalAccessor(signal_name, get_pre, get_value) {
   this.signal_name = signal_name;
   this.get_pre = get_pre;
   this.get_value = get_value;
}

exports.SignalAccessor = SignalAccessor;

function present(signal_name) {
   return new SignalAccessor(signal_name, false, false);
}

exports.present = present;

function prePresent(signal_name) {
   return new SignalAccessor(signal_name, true, false);
}

exports.prePresent = prePresent;

function value(signal_name) {
   return new SignalAccessor(signal_name, false, true);
}

exports.value = value;

function preValue(signal_name) {
   return new SignalAccessor(signal_name, true, true);
}

exports.preValue = preValue;
