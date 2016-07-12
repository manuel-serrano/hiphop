"use strict"
"use hopscript"

const ast = require("./ast.js");
const error = require("./error.js");

/* TODO:
   - trigger error on unexpected attributes?
   - check that signal are in allowed position in the whole code, and
     not just on top-level or a let top-level.
*/

/* Check and prepare attributes for action nodes */
function check_action_node(loc, attrs, mandatory=true) {
   attrs.args = check_func_args_list(loc, attrs.func, attrs, "arg");

   if (mandatory && (!attrs.func && attrs.args.length == 0))
      throw new error.SyntaxError("Missing expression.", loc);
}

/* Check and prepare attributes for expression nodes */
function check_expression_node(loc, attrs) {
   check_action_node(loc, attrs, false);
   let immediate = attrs.immediate == "";
   let valid_expr = attrs.func || attrs.args.length > 0;

   if (immediate)
      if (valid_expr)
	 throw new error.SyntaxError("Can't use `immediate` with expression.",
				     loc);

   /* If no expression is given, it must be a `signal` attribute
      to embed in an expression */
   if (!valid_expr) {
      check_signal_name(loc, attrs.signal);
      attrs.args[0] = attrs.pre == "" ?
	 prePresent(attrs.signal) :
	 present(attrs.signal);
   }
}

/* Check and prepare signal emission nodes (Emit and Sustain) */
function check_emit_node(loc, attrs) {
   check_action_node(loc, attrs, false);
   check_signal_name(loc, attrs.signal);

   for (let name in attrs.args) {
      let arg = attrs.args[name];

      if (arg instanceof SignalAccessor
	  && arg.signal_name == attrs.signal
	  && !arg.get_pre)
	 throw new error.SignalError("Can't get current value of a signal to" +
				     " update itself.", attrs.signal, loc);
   }
}

/* Functon that checks and prepare attributes for CountExpressionNode */
function check_count_expression_node(loc, attrs) {
   attrs.count = parse_value(attrs.count);
   check_expression_node(loc, attrs);
   attrs.args_count = check_func_args_list(loc, attrs.funccount, attrs,
					   "argcount");

   if (attrs.count != undefined &&
       (parseInt(attrs.count) != attrs.count || attrs.count < 0))
      throw new error.SyntaxError("Attribute `count` must be a positive" +
				  " integer.", attrs.loc);

   if (attrs.count && (attrs.funccount || attrs.args_count.length > 0))
      throw new error.SyntaxError("Can't use `count` and count expression.",
				  loc);

   if ((attrs.count || attrs.funccount || attrs.args_count.length > 0) &&
       attrs.immediate == "")
      throw new error.SyntaxError("Can't use `immediate` with count or " +
				  "count expression.", loc);

   if (attrs.count)
      attrs.args_count[0] = attrs.count;
}

/* Heler function that check if `func` is a Function, and gets its arguments */
function check_func_args_list(loc, func, attrs, args_prefix) {
   let args = check_varargs(loc, args_prefix, attrs);

   type_test(func, Function, loc);

   if (func) {
      if (func.length != args.length)
	 throw new error.SyntaxError("The arity of function is " + func.length +
				     " but " + args.length + " are given.", loc)
   } else {
      if (args.length > 1)
	 throw new error.SyntaxError("Missing `func` callback, with needed" +
				     " arity of " + args.length + ".", loc);
   }

   return args;
}

/* Check vararg. Vararg must be with the following format:
   prefix (if only one argument) or prefix0, prefix1, ... prefixN */
function check_varargs(loc, prefix, attrs) {
   let unique = -1;
   let args_list = [];

   for (let key in attrs) {
      if (key == prefix && unique == false) {
	 throw new error.SyntaxError("`" + prefix + "` must be unique argument",
				     loc);
      } else if (key == prefix && unique == -1) {
	 unique = true;
	 args_list[0] = parse_value(attrs[key]);
      } else if (key.split(prefix)[0] == '') { // use startsWith when availible
	 if (unique == true)
	    throw new error.SyntaxError("Can't have several arguments in this" +
					" context", loc);
	 let id = key.split(prefix)[1];

	 if (id.split("count")[0] == '') /* id starts with "count" */
	    continue;

	 if (parseInt(id) != id)
	    throw new error.SyntaxError("Prefix `" + prefix + "` must be " +
					"followed by a positive int", loc);

	 unique = false;

	 if (id < 0)
	    throw new error.SyntaxError("Can't have a negative argument " +
					"position", loc);
	 if (args_list[id])
	    throw new error.SyntaxError("`" + key + "` must be unique", loc);

	 args_list[id] = parse_value(attrs[key]);
      }
   }

   let len = 0;
   for (let i in args_list)
      len++;
   if (len != args_list.length)
      throw new error.SyntaxError("Missing arguments", loc);

   return args_list;
}

/* Helper function that checks if signal_name attribute is present
   and if it's a string */
function check_signal_name(loc, signame) {
   if (!signame)
      throw new error.SyntaxError("`signal` must be specified.", loc);
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
      throw new error.SyntaxError("Missing children (min:" + min +
				  " given:" + children.length + ").",
				  loc);

  if (max > -1 && children.length > max)
     throw new error.SyntaxError("Too much children (max:" + max +
				 " given:" + children.length + ").", loc);

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

function lower_attributes(attrs) {
   if (!attrs)
      attrs = {};

    for (let name in attrs) {
      let name_lower = name.toLowerCase();
      if (name_lower != name) {
	 attrs[name_lower] = attrs[name];
	 delete attrs[name];
	 name = name_lower;
      }
    }

   return attrs;
}

function implicit_sequence(attrs, children) {
   if (children.length == 1)
      return children;
   return new ast.Sequence(null, format_loc(attrs), children);
}

/* TODO: This function is *very* old and nasty, rewrite it! */
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

exports.type_test = type_test;

function MODULE(attrs) {
   attrs = lower_attributes(attrs);
   let loc = format_loc(attrs);
   let children = check_children(arguments, loc, 1, -1);
   let inputs = [];
   let outputs = [];
   let i = 0;
   let j = 0;

   /* Get all interface signal declarations */
   while(children[i] instanceof ast.InputSignal ||
	 children[i] instanceof ast.OutputSignal ||
	 children[i] instanceof ast.IOSignal) {
      let child = children[i];

      if (child instanceof ast.IOSignal) {
	 if (inputs.indexOf(child) > -1 || outputs.indexOf(child) > -1)
	    throw new error.SignalError("Name of IOSignal already used.",
					child.name, loc);
	 inputs.push(child);
	 outputs.push(child);
      } else if (child instanceof ast.InputSignal) {
	 if (inputs.indexOf(child) > -1 || outputs.indexOf(child) > -1)
	    throw new error.SignalError("Name of InputSignal already used.",
					child.name, loc);
	 inputs.push(child);
      } else {
	 if (inputs.indexOf(child) > -1 || outputs.indexOf(child) > -1)
	    throw new error.SignalError("Name of OutputSignal already used.",
					child.name, loc);
	 outputs.push(child);
      }
      i++;
   }

   /* Checks code following interface signal declaration is only
      regular statements */
   let stmts = children.slice(i, children.length);
   j = i;
   for (; i < children.length; i++) {
      if (!(children[i] instanceof ast.ASTNode))
	 throw new error.SyntaxError("Unknown instruction `" + children[i] +
				     "`", format_loc(attrs));
      else if (children[i] instanceof ast.InputSignal ||
	       children[i] instanceof ast.OutputSignal ||
	       children[i] instanceof ast.IOSignal)
	 throw new error.SyntaxError("Can't use innput/output signal" +
				     "declaration inside reactive" +
				     " instruction code.",
				     children[i].loc);
   }

   children = children.slice(0, j);
   if (stmts.length > 1)
      children = children.concat(implicit_sequence(attrs, stmts));
   else
      children.push(stmts[0]);
   return new ast.Module(attrs.id, loc, children);
}

exports.MODULE = MODULE;

function LET(attrs) {
   attrs = lower_attributes(attrs);
   let loc = format_loc(attrs);
   let children = check_min_children(arguments, loc, 1);
   let stop_signal = undefined;

   function mk_tree(children) {
      let car = children[0];

      if (car instanceof ast.Signal) {
	 car.children = [mk_tree(children.slice(1))];
      } else {
	 car = implicit_sequence(attrs, children.concat(NOTHING(attrs)));
      }

      return car;
   }

   for (let i in children) {
      let child = children[i];
      let is_local_signal = child instanceof ast.Signal;

      if (i == 0 && !is_local_signal) {
	 throw new error.SyntaxError("First statement of Let must be a " +
				     "local signal.", loc);
      } else if (child instanceof ast.InputSignal ||
		 child instanceof ast.OutputSignal ||
		 child instanceof ast.IOSignal) {
	 throw new error.SyntaxError("Global signal are not allowed in a " +
				     "Let statement", loc);
      } else if (is_local_signal && stop_signal) {
	 throw new error.SyntaxError("Local signal are not allowed here", loc);
      } else if (!is_local_signal) {
	 stop_signal = i;
      }
   }

   return new ast.Let(attrs.id, loc, mk_tree(children));
}

exports.LET = LET;

function EMIT(attrs) {
   let loc = format_loc(attrs);

   check_no_children(arguments, loc);
   attrs = lower_attributes(attrs);
   check_emit_node(loc, attrs);
   return new ast.Emit(attrs.id, loc, attrs.signal, attrs.func, attrs.args);
}

exports.EMIT = EMIT;

function SUSTAIN(attrs) {
   let loc = format_loc(attrs);

   check_no_children(arguments, loc);
   attrs = lower_attributes(attrs);
   check_emit_node(loc, attrs);
   return new ast.Sustain(attrs.id, loc, attrs.signal, attrs.func, attrs.args);
}

exports.SUSTAIN = SUSTAIN;

function IF(attrs) {
   let loc = format_loc(attrs);
   let children = check_children(arguments, loc, 1, 2);

   attrs = lower_attributes(attrs);
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

   attrs = lower_attributes(attrs);
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
   attrs = lower_attributes(attrs);
   return new ast.Nothing(attrs.id, loc);
}

exports.NOTHING = NOTHING;

function PAUSE(attrs) {
   let loc = format_loc(attrs);

   check_no_children(arguments, loc);
   attrs = lower_attributes(attrs);
   return new ast.Pause(attrs.id, loc);
}

exports.PAUSE = PAUSE;

function HALT(attrs) {
   let loc = format_loc(attrs);

   check_no_children(arguments, loc);
   attrs = lower_attributes(attrs);
   return new ast.Halt(attrs.id, loc);
}

exports.HALT = HALT;

function AWAIT(attrs) {
   let loc = format_loc(attrs);

   check_no_children(arguments, loc);
   attrs = lower_attributes(attrs);
   check_count_expression_node(loc, attrs);
   return new ast.Await(attrs.id,
			loc,
			attrs.func,
			attrs.args,
			attrs.immediate != undefined,
			attrs.funccount,
			attrs.args_count);
}

exports.AWAIT = AWAIT;

function PARALLEL(attrs) {
   let loc = format_loc(attrs);
   let children = check_min_children(arguments, loc, 1);

   attrs = lower_attributes(attrs);
   return new ast.Parallel(attrs.id, loc, children);
}

exports.PARALLEL = PARALLEL;

function ABORT(attrs) {
   let loc = format_loc(attrs);
   let children = check_min_children(arguments, loc, 1);


   attrs = lower_attributes(attrs);
   check_count_expression_node(loc, attrs);
   return new ast.Abort(attrs.id,
			loc,
			attrs.func,
			attrs.args,
			attrs.immediate != undefined,
			attrs.funccount,
			attrs.args_count,
			implicit_sequence(attrs, children));
}

exports.ABORT = ABORT;


function WEAKABORT(attrs) {
   let loc = format_loc(attrs);
   let children = check_min_children(arguments, loc, 1);


   attrs = lower_attributes(attrs);
   check_count_expression_node(loc, attrs);
   return new ast.WeakAbort(attrs.id,
			    loc,
			    attrs.func,
			    attrs.args,
			    attrs.immediate != undefined,
			    attrs.funccount,
			    attrs.args_count,
			    implicit_sequence(attrs, children));
}

exports.WEAKABORT = WEAKABORT;

function SUSPEND(attrs) {
   let loc = format_loc(attrs);
   let children = check_min_children(arguments, loc, 1);

   attrs = lower_attributes(attrs);
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

   attrs = lower_attributes(attrs);
   return new ast.Loop(attrs.id, loc, implicit_sequence(attrs, children));
}

exports.LOOP = LOOP;

function LOOPEACH(attrs) {
   let loc = format_loc(attrs);
   let children = check_min_children(arguments, loc, 1);

   attrs = lower_attributes(attrs);
   check_count_expression_node(loc, attrs);
   return new ast.LoopEach(attrs.id,
			   loc,
			   implicit_sequence(attrs, children),
			   attrs.func,
			   attrs.args,
			   attrs.funccount,
			   attrs.args_count);
}

exports.LOOPEACH = LOOPEACH;

function EVERY(attrs) {
   let loc = format_loc(attrs);
   let children = check_min_children(arguments, loc, 1);

   attrs = lower_attributes(attrs);
   check_count_expression_node(loc, attrs);
   return new ast.Every(attrs.id,
			loc,
			implicit_sequence(attrs, children),
			attrs.func,
			attrs.args,
			attrs.immediate != undefined,
			attrs.funccount,
			attrs.args_count);
}

exports.EVERY = EVERY;

function SEQUENCE(attrs) {
   let loc = format_loc(attrs);
   let children = check_min_children(arguments, loc, 2);

   attrs = lower_attributes(attrs);
   return new ast.Sequence(attrs.id, loc, children);
}

exports.SEQUENCE = SEQUENCE;

function ATOM(attrs) {
   let loc = format_loc(attrs);

   check_no_children(arguments, loc);
   attrs = lower_attributes(attrs);
   check_action_node(loc, attrs);
   return new ast.Atom(attrs.id, loc, attrs.func, attrs.args);
}

exports.ATOM = ATOM;

function TRAP(attrs) {
   let loc = format_loc(attrs);
   let children = check_min_children(arguments, loc, 1);

   lower_attributes(attrs);
   return new ast.Trap(attrs.id, loc, attrs.name,
		       implicit_sequence(attrs, children));
}

exports.TRAP = TRAP;

function EXIT(attrs) {
   let loc = format_loc(attrs);

   check_no_children(arguments, loc);
   lower_attributes(attrs);
   return new ast.Exit(attrs.id, loc, attrs.trap);
}

exports.EXIT = EXIT;

function init_signal_declaration(attrs, loc, mandatory, optional) {
   attrs = lower_attributes(attrs);
   let combine = false;

   check_signal_name(loc, attrs.name);

   if (attrs.combine) {
      if (!(attrs.combine instanceof Function))
	 throw new error.TypeError("Function", typeof(attrs.combine), loc);
      combine = true;
   }

   if (attrs.reset) {
      if (!combine)
	 throw new error.SyntaxError("`reset` must always be used " +
				      "with a combinaison function", loc);
      if (!(attrs.reset instanceof Function))
	 throw new error.TypeError("Function", typeof(attrs.reset), loc)
      if (attrs.reset.length != 0)
	 throw new error.TypeError("Function with arity 0", "Function with" +
				   "arity " + attrs.reset.length, loc)
   }

   let sigdecl = {};
   sigdecl.name = attrs.name;
   sigdecl.value = parse_value(attrs.value);
   sigdecl.combine = attrs.combine;
   sigdecl.valued = attrs.valued != undefined;
   sigdecl.reset = attrs.reset;

   type_test(sigdecl.combine, Function, loc);
   if (sigdecl.valued
       || sigdecl.combine != undefined
       || sigdecl.value != undefined
       || sigdecl.reset != undefined)
      sigdecl.valued = true;
   return sigdecl;
}

function INPUTSIGNAL(attrs) {
   let loc = format_loc(attrs);
   let sigdecl = init_signal_declaration(attrs, loc, ["name"],
					 ["value", "combine",
					  "valued", "reset"]);
   check_no_children(arguments, loc);
   return new ast.InputSignal(attrs.id,
			      loc,
			      sigdecl.name,
			      sigdecl.value,
			      sigdecl.reset,
			      sigdecl.combine,
			      sigdecl.valued);
}

exports.INPUTSIGNAL = INPUTSIGNAL;

function OUTPUTSIGNAL(attrs) {
   let loc = format_loc(attrs);
   let sigdecl = init_signal_declaration(attrs, loc, ["name"],
					 ["value", "combine",
					  "valued", "reset"]);
   check_no_children(arguments, loc);
   return new ast.OutputSignal(attrs.id,
			       loc,
			       sigdecl.name,
			       sigdecl.value,
			       sigdecl.reset,
			       sigdecl.combine,
			       sigdecl.valued);
}

exports.OUTPUTSIGNAL = OUTPUTSIGNAL;

function IOSIGNAL(attrs) {
   let loc = format_loc(attrs);
   let sigdecl = init_signal_declaration(attrs, loc, ["name"],
					 ["value", "combine",
					  "valued", "reset"]);
   check_no_children(arguments, loc);
   return new ast.IOSignal(attrs.id,
			   loc,
			   sigdecl.name,
			   sigdecl.value,
			   sigdecl.reset,
			   sigdecl.combine,
			   sigdecl.valued);
}

exports.IOSIGNAL = IOSIGNAL;

/* LocalSignal */
function SIGNAL(attrs) {
   let loc = format_loc(attrs);
   let sigdecl = init_signal_declaration(attrs, loc, ["name"], ["value",
								"combine",
								"valued",
								"reset"]);
   check_no_children(arguments, loc);
   return new ast.LocalSignal(attrs.id,
			      loc,
			      undefined, /* will be filed with LET statement */
			      sigdecl.name,
			      sigdecl.value,
			      sigdecl.reset,
			      sigdecl.combine,
			      sigdecl.valued);
}

exports.SIGNAL = SIGNAL;

function RUN(attrs) {
   function _rename(ast_node, sigs_assoc) {
      if (ast_node.signal_name) {
	 let name = sigs_assoc[ast_node.signal_name];

	 if (name)
	    ast_node.signal_name = name;
      }

      for (let i in ast_node.args_list) {
	 let arg = ast_node.args_list[i];

	 if (arg instanceof SignalAccessor) {
	    let name = sigs_assoc[arg.signal_name];

	    if (name)
	       arg.signal_name = name;
	 }
      }

      for (let i in ast_node.children)
	 _rename(ast_node.children[i], sigs_assoc);
   }

   attrs = lower_attributes(attrs);
   let loc = format_loc(attrs);
   let run_module = attrs.module.clone();
   let sigs_assoc = attrs.sigs_assoc;
   let sigs_assoc_len = Object.keys(sigs_assoc).length;

   /* array that contains runnable statements of the module
      (other stmt than i/o signal and module) */
   let module_stmts = [];

   check_no_children(arguments, loc);
   if(!(run_module instanceof ast.Module))
      error.SyntaxError("`module` must be an instanceof HipHop.js Module.",
			loc);


   for (let i = 0; i < run_module.children.length; i++) {
      let stmt = run_module.children[i];

      if (!(stmt instanceof ast.Module) &&
	  !(stmt instanceof ast.InputSignal) &&
	  !(stmt instanceof ast.OutputSignal)) {
	 module_stmts.push(stmt);
	 _rename(stmt, sigs_assoc);
      }
   }

   return new ast.Run(attrs.id,
		      format_loc(attrs),
		      implicit_sequence(attrs, module_stmts));
}

exports.RUN = RUN;

function EXEC(attrs) {
   function exec_interface_err(loc, field, type="Optional") {
      throw new SyntaxError(type + " field `" + field + "` of exec interface " +
			    "must be a function.", loc);
   }

   let exec_interface;
   let loc;

   attrs = lower_attributes(attrs);
   exec_interface = attrs["interface"];
   loc = format_loc(attrs);
   check_no_children(arguments, loc);

   if (attrs.signal_name)
      check_signal_name(loc, attrs.signal_name);

   /* check interface attribute validity */
   if (typeof(exec_interface) != "object")
      throw new SyntaxError("`interface` attribute must be an object.", loc);
   if (typeof(exec_interface.start) != "function")
      exec_interface_err(loc, "start", "Mandatory");
   if (exec_interface.kill && typeof(exec_interface.kill) != "function")
      exec_interface_err(loc, "kill");
   if (exec_interface.susp && typeof(exec_interface.susp) != "function")
      exec_interface_err(loc, "susp");
   if (exec_interface.res && typeof(exec_interface.res) != "function")
      exec_interface_err(loc, "res");
   attrs.args = check_func_args_list(loc, exec_interface.start, attrs, "arg");

   return new ast.Exec(attrs.id, loc, attrs.signal, exec_interface, attrs.args);
}

exports.EXEC = EXEC;

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
