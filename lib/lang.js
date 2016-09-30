"use strict"
"use hopscript"

const ast = require("./ast.js");
const error = require("./error.js");

//
// HH reserved keywords, can't be used as signal or trap names
//
const KEYWORDS = /(\d|^)(immediate|pre|value|not|apply|countValue|countApply|res|susp|kill|ifapply|ifvalue|id)(\s|$)/i;

//
// Return a well formed string of the location of the HH instruction.
//
function format_loc(attrs) {
   let loc = attrs["%location"];

   if (loc != undefined)
      return loc.filename + ":" + loc.pos;

   return "[LOC DISABLED --- run hop -g to get location]";
}

//
// Get a list of signal name.
//
function get_signal_name_list(attrs, loc) {
   let signal_name_list = [];

   for (let name in attrs)
      if (!name.match(KEYWORDS) && name != "%location")
	 signal_name_list.push(name);

   return signal_name_list;
}

//
// Get the name of a trap. It must be unique, an error is thrown
// otherwise.
//
function get_trap_name(attrs) {
   let loc = format_loc(attrs);
   let trap_name = ""

   for (let name in attrs) {
      if (!name.match(KEYWORDS) && name != "%location") {
	 if (trap_name == "") {
	    trap_name = name;
	 } else {
	    throw new error.SyntaxError("Only one trap name expected." +
					" At least two given: " +
					trap_name + " " + name + ".", loc);
	 }
      }
   }

   if (trap_name == "")
      throw new error.SyntaxError("Trap name is missing.", loc);

   return trap_name;
}

//
// Parse MODULE and LET instructions in order to returns a list of
// signal declarations objects. These objets contains following fields:
//
// `name` the name of the signal
// `accessibility` hh.IN hh.OUT hh.INOUT if undefined, hh.INOUT by default
// `init_func` initialisation of signal when their scope is created
// `init_accessor_list` list of signal accessor used in init_func
// `reinit_func` reinitialisation of signal at each reaction
// `reinit_accessor_list` list of signal accessor used in reinit_func
// `combine` a combinaison function with arity 2
// `bound` contains a signal name on which this signal is bounded
//
// See ast.js for more details about these objets.
//
function get_signal_declaration_list(attrs, loc) {
   let signal_declaration_list = [];

   for (let name in attrs) {
      if (name == "%location")
	 continue;

      let prop = attrs[name];
      let init_func;
      let init_accessor_list = [];
      let reinit_func;
      let reinit_accessor_list = [];

      if (name.match(KEYWORDS))
	 throw new error.SyntaxError(name + " is a reserved keyword. It can " +
				     "be used as signal name.", loc);

      if (prop && typeof(prop) != "object")
	 throw new error.SyntaxError("Properties of a signal must be given " +
				     "through a JS object.", loc);

      if (prop.accessibility &&
	  prop.accessibility != IN &&
	  prop.accessibility != OUT &&
	  prop.accessibility != INOUT)
	 throw new error.SyntaxError("Accessibility of a signal must be " +
				     "hh.IN, hh.OUT, or hh.INOUT.", loc);

      if (prop.initValue && prop.initApply)
	 throw new error.SyntaxError("Initial value must be given through " +
				     "initValue or initApply. Not both.", loc);

      if (prop.reinitValue && prop.reinitApply)
	 throw new error.SyntaxError("Reinit value must be given through " +
				     "reinitValue or reinitApply. Not both",
				     loc);

      if (prop.initApply && !(prop.initApply instanceof Function))
	 throw new error.SyntaxError("initApply must be a function.", loc);

      if (prop.reinitApply && !(prop.reinitApply instanceof Function))
	 throw new error.SyntaxError("reinitApply must be a function.", loc);

      if (prop.combine) {
	 if (!(prop.combine instanceof Function))
	    throw new error.SyntaxError("combine must be a function.", loc);
	 else if (prop.combine.length != 2)
	    throw new error.SyntaxError("Arity on combine must be 2.", loc);
      }

      if (prop.bound && !(typeof(prop.bound) == "string" ||
			  prop.bound instanceof String))
	 throw new error.SyntaxError("bound must be a string.", loc);

      if (prop.initValue !== undefined) {
	 init_func = () => prop.initValue;
      } else if (prop.initApply) {
	 init_func = prop.initApply;
	 init_accessor_list = get_accessor_list(init_func, loc);
      }

      if (prop.reinitValue !== undefined) {
	 reinit_func = () => prop.reinitValue;
      } else if (prop.reinitApply) {
	 reinit_func = prop.reinitApply;
	 reinit_accessor_list = get_accessor_list(reinit_func, loc);
      }

      signal_declaration_list.push(
	 new ast.SignalProperties(name,prop.accessibility, init_func,
				  init_accessor_list, reinit_func,
				  reinit_accessor_list, prop.combine,
				  prop.bound));
   }

   return signal_declaration_list;
}

//
// Returns a list of accessors of signal, used to build dependencies
// and receiver of runtine functions.
//
function get_accessor_list(func, loc) {
   if (!func)
      return [];

   const regex = new RegExp("this\\.(value|preValue|present|prePresent)\\.[a-zA-Z0-9_]+", "g");
   let raw_signals = func.toString().match(regex);

   if (!raw_signals)
      return [];

   return raw_signals.map(function(el, i, arr) {
      let s = el.split(".");

      if (s[0] != "this" || s.length < 3)
	 throw new error.InternalError("Wrong accessor parsing (1)", loc);

      let name = s[2];

      switch (s[1]) {
      case "value":
	 return value(name);
      case "preValue":
	 return preValue(name);
      case "present":
	 return present(name);
      case "prePresent":
	 return prePresent(name);
      default:
	 throw new error.InternalError("Wrong accessor parsing (2)", loc);
      }
   });
}

//
// Parse a HH expression and returns an object containing the
// following fields:
//
// `loc` the location of the node
// `id` an identifier given by user
// `signal_name_list` the name of a signal
// `func` a function to call at runtime
// `accessor_list` accessor list of signal to access at runtime
// `immediate` boolean
// `pre` boolean
// `not` boolean
// `func_count` a function to call at runtime/GO
// `accesor_list_count` accessor list of signal to access at runtime/GO
//
function get_arguments(attrs, loc) {
   let raw = {};
   let args = {
      loc: loc,
      id: "",
      signal_name_list: [],
      func: null,
      accessor_list: [],
      immediate: false,
      not: false,
      pre: false,
      func_count: null,
      accessor_list_count: []
   };

   for (let name in attrs)
      if (name.match(KEYWORDS))
	 raw[name.toLowerCase()] = attrs[name];

   if (raw.value && raw.apply)
      throw new error.SyntaxError("apply and value can't be used at same time.",
				  loc);

   if (raw.apply && !(raw.apply instanceof Function))
      throw new error.SyntaxError("apply must be a function.", loc);

   if (raw.immediate && (raw.value || raw.apply))
      throw new error.SyntaxError("immediate can't be used with an expression.",
				  loc);

   if (raw.pre && (raw.value || raw.apply))
      throw new error.SyntaxError("pre can't be used with an expression.", loc);

   if (raw.apply) {
      args.func = raw.apply
      args.accessor_list = get_accessor_list(raw.apply, loc);
   } else if (raw.value !== undefined) {
      args.func = () => raw.value;
   }

   if (raw.countapply) {
      if (!(raw.countapply instanceof Function))
	 throw new error.SyntaxError("countApply must be a function.", loc);
      args.func_count = raw.countapply;
      args.accessor_list_count = get_accessor_list(raw.countapply, loc);
   } else if (raw.countvalue !== undefined) {
      args.func_count = () => raw.countvalue;
   }

   args.immediate = raw.hasOwnProperty("immediate");
   args.pre = raw.hasOwnProperty("pre");
   args.signal_name_list = get_signal_name_list(attrs, loc);
   args.id = raw.id;
   args.not = raw.hasOwnProperty("not");

   return args;
}

//
// Gets arguments of action node and check their validity.
//
function get_arguments_action_node(attrs) {
   let loc = format_loc(attrs);
   let args = get_arguments(attrs, loc);

   if (!args.func)
      throw new error.SyntaxError("Missing expression.", loc);

   return args;
}

//
// Gets arguments of (count)expression node and check their validity.
//
function get_arguments_expression_node(attrs, loc=null) {
   if (!loc)
      loc = format_loc(attrs);

   let args = get_arguments(attrs, loc);
   let signal_name = args.signal_name_list[0];

   if (args.signal_name_list.length > 1)
      throw new error.SyntaxError("Only one signal name expected. " +
				  args.signal_name_list.length + " given: " +
				  args.signal_name_list, loc);

   if (signal_name && args.func)
      throw new error.SyntaxError("An expression node can take a signal or " +
				  "an expression. Not both.", loc);

   if (signal_name)
      args.accessor_list[0] = (args.pre ?
			       prePresent(signal_name) :
			       present(signal_name));
   else if (!args.func)
      throw new error.SyntaxError("Missing signal or missing expression.", loc);


   if (args.pre && !signal_name)
      throw new error.SyntaxError("Can't use pre without signal.", loc);


   return args;
}

//
// Gets arguments of count expression node and check their validity.
//
function get_arguments_count_expression_node(attrs) {
   let loc = format_loc(attrs);
   let args = get_arguments_expression_node(attrs, loc);

   if (args.immediate && args.func_count)
      throw new error.SyntaxError("Can't use immediate with count expression.",
				  loc);

   return args;
}

//
// Gets arguments of emit node and check their validity.
//
function get_arguments_emit_node(attrs, exec_context=false) {
   let ctxt = exec_context ? "exec" : "emit";
   let loc = format_loc(attrs);
   let args = get_arguments(attrs, loc);
   let signal_name_list = args.signal_name_list;

   if (signal_name_list.length == 0 && !exec_context)
      throw new error.SyntaxError("Signal name is missing.", loc);

   if (args.func_count)
      throw new error.SyntaxError("Counter expression can't be used in " +
				  ctxt + ".", loc);

   if (args.pre)
      throw new error.SyntaxError("pre can't be used in " + ctxt + ".", loc);

   if (args.immediate)
      throw new error.SyntaxError("immediate can't be used in " + ctxt + ".",
				  loc);

   for (let i in args.accessor_list) {
      let acc = args.accessor_list[i];

      for (let j in signal_name_list) {
	 let signal_name = signal_name_list[j];

	 if (acc.signal_name == signal_name && !acc.get_pre && !exec_context)
	    throw new error.SyntaxError("Can't get current value of a " +
					"signal to update itself. " +
					"(missing pre?)", loc);
      }
   }

   if (!exec_context) {
      args.if_accessor_list = [];

      for (let name in attrs) {
	 function _error_exclusive() {
	    throw new error.SyntaxError("ifApply and ifValue are exclusives.",
					loc);
	 }

	 let if_exists = false;

	 if (name.toLowerCase() == "ifapply") {
	    let apply = attrs[name];

	    if (if_exists)
	       _error_exclusive();
	    if_exists = true;

	    if (!(apply instanceof Function))
	       throw new error.SyntaxError("ifApply must be a function.", loc);
	    args.if_func = apply;
	    args.if_accessor_list = get_accessor_list(apply, loc);
	 }

	 if (name.toLowerCase() == "ifvalue") {
	    if (if_exists)
	       _error_exclusive();
	    if_exists = true;
	    args.if_func = () => attrs[name];
	 }
      }
   }

   return args;
}

//
// Build an implicit sequence from a list of HH instructions.
//
function make_implicit_sequence(attrs, children) {
   if (children.length == 1)
      return children;
   return new ast.Sequence(null, format_loc(attrs), children);
}

//
// Get childrens of a node. Ignore any value which is not an HH AST
// tree.
//
// Following functions are just helper to check the number of
// children.
//
function get_children(node_arguments, min, max) {
   let children = [];
   let attrs = node_arguments[0] ? node_arguments[0] : {};
   let loc = format_loc(attrs);
   let raw = Array.prototype.slice.call(node_arguments, 1,
					node_arguments.length);

   for (let i in raw)
      if (raw[i] instanceof ast.ASTNode)
	 children.push(raw[i]);

   if (children.length < min || (max > -1 && children.length > max)) {
      let msg = "Children arity error. Expected ";

      if (min > -1 && max > -1)
	 msg += "min " + min + " max " + max;
      else if (min > -1)
	 msg += "min " + min;
      else if (max > -1)
	 msg += "max " + max;

      throw new error.SyntaxError(msg + ", but " + children.length + " given.",
				  loc);
   }

   return children;
}

function check_no_children(node_arguments) {
   get_children(node_arguments, 0, 0)
}

function get_children_min(node_arguments, min) {
   return get_children(node_arguments, min, -1)
}

function MODULE(attrs) {
   if (!attrs) attrs = {};
   let loc = format_loc(attrs);
   let children = get_children_min(arguments, 1);

   return new ast.Module(attrs.id,
			 loc,
			 get_signal_declaration_list(attrs, loc),
			 make_implicit_sequence(attrs, children));
}

exports.MODULE = MODULE;

function LET(attrs) {
   if (!attrs) attrs = {};
   let loc = format_loc(attrs);
   let children = get_children_min(arguments, 1);

   return new ast.Let(attrs.id,
		      loc,
		      get_signal_declaration_list(attrs, loc),
		      make_implicit_sequence(attrs, children));
}

exports.LET = LET;

function EMIT(attrs) {
   if (!attrs) attrs = {};
   let args = get_arguments_emit_node(attrs);

   check_no_children(arguments);
   return new ast.Emit(args.id, args.loc, args.signal_name_list, args.func,
		       args.accessor_list, args.if_func, args.if_accessor_list);
}

exports.EMIT = EMIT;

function SUSTAIN(attrs) {
   if (!attrs) attrs = {};
   let args = get_arguments_emit_node(attrs);

   check_no_children(arguments);
   return new ast.Sustain(args.id, args.loc, args.signal_name_list, args.func,
			  args.accessor_list, args.if_func,
			  args.if_accessor_list);
}

exports.SUSTAIN = SUSTAIN;

function IF(attrs) {
   if (!attrs) attrs = {};
   let loc = format_loc(attrs);
   let args = get_arguments_expression_node(attrs);
   let children = get_children(arguments, 1, 2);

   return new ast.If(args.id,
		     loc,
		     [children[0], children[1]],
   		     args.not,
   		     args.func,
   		     args.accessor_list);
}

exports.IF = IF;

function NOTHING(attrs) {
   if (!attrs) attrs = {};
   check_no_children(arguments);
   return new ast.Nothing(attrs.id, format_loc(attrs));
}

exports.NOTHING = NOTHING;

function PAUSE(attrs) {
   if (!attrs) attrs = {};
   check_no_children(arguments);
   return new ast.Pause(attrs.id, format_loc(attrs));
}

exports.PAUSE = PAUSE;

function HALT(attrs) {
   if (!attrs) attrs = {};
   check_no_children(arguments);
   return new ast.Halt(attrs.id, format_loc(attrs));
}

exports.HALT = HALT;

function AWAIT(attrs) {
   if (!attrs) attrs = {};
   let args = get_arguments_count_expression_node(attrs);

   check_no_children(arguments);
   return new ast.Await(args.id,
			args.loc,
			args.func,
			args.accessor_list,
			args.immediate,
			args.func_count,
			args.accessor_list_count);
}

exports.AWAIT = AWAIT;

function PARALLEL(attrs) {
   if (!attrs) attrs = {};
   let children = get_children_min(arguments, 1);
   return new ast.Parallel(attrs.id, format_loc(attrs), children);
}

exports.PARALLEL = PARALLEL;

function ABORT(attrs) {
   if (!attrs) attrs = {};
   let args = get_arguments_count_expression_node(attrs);
   let children = get_children_min(arguments, 1);

   return new ast.Abort(args.id,
			args.loc,
			args.func,
			args.accessor_list,
			args.immediate,
			args.func_count,
			args.accessor_list_count,
			make_implicit_sequence(attrs, children));
}

exports.ABORT = ABORT;


function WEAKABORT(attrs) {
   if (!attrs) attrs = {};
   let args = get_arguments_count_expression_node(attrs);
   let children = get_children_min(arguments, 1);

   return new ast.WeakAbort(args.id,
			    args.loc,
			    args.func,
			    args.accessor_list,
			    args.immediate,
			    args.func_count,
			    args.accessor_list_count,
			    make_implicit_sequence(attrs, children));
}

exports.WEAKABORT = WEAKABORT;

function SUSPEND(attrs) {
   if (!attrs) attrs = {};
   let args = get_arguments_expression_node(attrs);
   let children = get_children_min(arguments, 1);

   return new ast.Suspend(args.id,
			  args.loc,
			  make_implicit_sequence(attrs, children),
			  args.func,
			  args.accessor_list,
			  args.immediate);
}

exports.SUSPEND = SUSPEND;

function LOOP(attrs) {
   if (!attrs) attrs = {};
   let children = get_children_min(arguments, 1);
   return new ast.Loop(attrs.id, format_loc(attrs),
		       make_implicit_sequence(attrs, children));
}

exports.LOOP = LOOP;

function LOOPEACH(attrs) {
   if (!attrs) attrs = {};
   let args = get_arguments_count_expression_node(attrs);
   let children = get_children_min(arguments, 1);

   return new ast.LoopEach(args.id,
			   args.loc,
			   make_implicit_sequence(attrs, children),
			   args.func,
			   args.accessor_list,
			   args.func_count,
			   args.accessor_list_count);
}

exports.LOOPEACH = LOOPEACH;

function EVERY(attrs) {
   if (!attrs) attrs = {};
   let args = get_arguments_count_expression_node(attrs);
   let children = get_children_min(arguments, 1);

   return new ast.Every(args.id,
			args.loc,
			make_implicit_sequence(attrs, children),
			args.func,
			args.accessor_list,
			args.immediate,
			args.func_count,
			args.accessor_list_count);
}

exports.EVERY = EVERY;

function SEQUENCE(attrs) {
   if (!attrs) attrs = {};
   let children = get_children_min(arguments, 1);
   return new ast.Sequence(attrs.id, format_loc(attrs), children);
}

exports.SEQUENCE = SEQUENCE;

function ATOM(attrs) {
   if (!attrs) attrs = {};
   let args = get_arguments_action_node(attrs);

   check_no_children(arguments);
   return new ast.Atom(args.id, args.loc, args.func, args.accessor_list);
}

exports.ATOM = ATOM;

function TRAP(attrs) {
   if (!attrs) attrs = {};
   let children = get_children_min(arguments, 1);
   return new ast.Trap(attrs.id, format_loc(attrs), get_trap_name(attrs),
		       make_implicit_sequence(attrs, children));
}

exports.TRAP = TRAP;

function EXIT(attrs) {
   if (!attrs) attrs = {};
   check_no_children(arguments);
   return new ast.Exit(attrs.id, format_loc(attrs), get_trap_name(attrs));
}

exports.EXIT = EXIT;

function RUN(attrs) {
   if (!attrs) attrs = {};
   let loc = format_loc(attrs);
   let module = attrs.module.clone();
   let signal_declaration_list = module.signal_declaration_list;

   check_no_children(arguments);
   for (let sig in signal_declaration_list) {
      let sigdecl = signal_declaration_list[sig];
      let sigbound = attrs[sigdecl.name];

      if (sigbound) {
	 if (typeof(sigbound) != "string" && !(sigbound instanceof String))
	    throw new error.SyntaxError("String expected on signal " +
					sigdecl.name + " bounding.", loc);
	 else
	    sigdecl.bound = sigbound;
      } else {
	 //
	 // Implicit bound to a signal with the same name, or no bound
	 // at all (if signal with same name didn't exists at compile
	 // time).
	 //
	 sigdecl.bound = -1;
      }
   }

   return new ast.Let(attrs.id, loc, signal_declaration_list,
		      make_implicit_sequence(attrs, module.children));
}

exports.RUN = RUN;

function EXEC(attrs) {
   if (!attrs) attrs = {};
   let args = get_arguments_emit_node(attrs, true);

   check_no_children(arguments);
   if (attrs.value)
      throw new error.SyntaxError("Exec must takes an apply argument.",
				  args.loc);

   if (attrs.res && !(attrs.res instanceof Function))
      throw new error.TypeError("Function", typeof attrs.res, loc);

   if (attrs.susp && !(attrs.susp instanceof Function))
      throw new error.TypeError("Function", typeof attrs.susp, loc);

   if (attrs.kill && !(attrs.kill instanceof Function))
      throw new error.TypeError("Function", typeof attrs.kill, loc);

   return new ast.Exec(args.id, args.loc, args.signal_name_list[0], args.func,
		       args.accessor_list, attrs.res, attrs.susp, attrs.kill);
}

exports.EXEC = EXEC;

//
// Helper function to build SignalAccessors
//
function present(signal_name) {
   return new ast.SignalAccessor(signal_name, false, false);
}

function prePresent(signal_name) {
   return new ast.SignalAccessor(signal_name, true, false);
}

function value(signal_name) {
   return new ast.SignalAccessor(signal_name, false, true);
}

function preValue(signal_name) {
   return new ast.SignalAccessor(signal_name, true, true);
}

//
// Accessibility constants for signal declarations
//
const IN = 1;
exports.IN = IN;

const OUT = 2;
exports.OUT = OUT;

const INOUT = 3;
exports.INOUT = INOUT;
