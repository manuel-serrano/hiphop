"use strict"
"use hopscript"

const hh = require("./hiphop.js");
const ast = require("./ast.js");
const error = require("./error.js");

//
// HH reserved keywords, can't be used as signal or trap names
//
const KEYWORDS = /(\d|^)(signal|immediate|pre|value|not|apply|countValue|countApply|res|susp|kill|ifApply|ifValue|id|from|fromValue|fromApply|to|toValue|toApply|toogleSignal|toogleValue|toogleApply|emitWhenSuspended|noDebug|name)(\s|$)/i;
exports.KEYWORDS = KEYWORDS;

//
// Return a well formed string of the location of the HH instruction.
//
const format_loc = function(attrs) {
   let loc = attrs["%location"];

   if (loc != undefined)
      return loc.filename + ":" + loc.pos;

   return "[LOC DISABLED --- run hop -g to get location]";
}
exports.format_loc = format_loc;

//
// Get a list of signal name.
//
const get_signal_name_list = function(attrs, loc) {
   let signal_name_list = [];

   for (let name in attrs) {
      if (!name.match(KEYWORDS) && name != "%location")
	 signal_name_list.push(name);
      else if (name.match(/^signal/i))
	 signal_name_list.push(attrs[name]);
   }

   return signal_name_list;
}
exports.get_signal_name_list = get_signal_name_list;

//
// Get the name of a trap. It must be unique, an error is thrown
// otherwise.
//
const get_trap_name = function(attrs) {
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
// Helper function telling is an object holds an HH instructions.
//
const isHiphopInstruction = function(obj) {
   return obj instanceof ast.ASTNode;
}
exports.isHiphopInstruction = isHiphopInstruction;

//
// Allows to easilly expands children node when building high level
// instructions (see macro.js, ../ulib/*.js)
//
const expandChildren = function(children) {
   function _expandChildren(c) {
      return <sequence nodebug>
        ${isHiphopInstruction(c[0]) ? c[0] : <nothing nodebug/>}
        ${c.length > 1 ? _expandChildren(c.slice(1)) : <nothing nodebug/>}
      </sequence>;
   }
   return _expandChildren(Array.prototype.slice.call(children, 1,
						     children.length));
}
exports.expandChildren = expandChildren;

//
// Parse MODULE and LOCAL instructions in order to returns a list of
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
const get_signal_declaration_list = function(attrs, loc) {
   let signal_declaration_list = [];

   for (let name in attrs) {
      if (name == "%location" || name.toLowerCase() == "name")
	 continue;

      let prop = attrs[name];
      let init_func;
      let init_accessor_list = [];
      let reinit_func;
      let reinit_accessor_list = [];

      if (name.match(KEYWORDS))
	 throw new error.SyntaxError(name + " is a reserved keyword." +
				     "It can be used as signal name.", loc);

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
// This function handles two cases:
//
//     - this.type.signal
//     - this.type["s"]
//
const get_accessor_list = function(func, loc) {


   if (!func)
      return [];

   let code = func.toString();

   //
   // This regex is buggy: \s dosen't seems to works, and the
   // workaround (\t| *) in order to detect horizontal space or
   // nothing, should probably fails on some cases...
   //
   const regex_error = new RegExp("this\\.(value|preValue|present|prePresent)(\\.[a-zA-Z0-9_]+|\\[\\\"[a-zA-Z0-9_]\\\"\\])((\t| *|.(?!=))=(?!=))", "g");

   if (code.match(regex_error))
      throw new error.SyntaxError("A signal accessor is immutable. "
   				  + "(You may want to use EMIT instead?)", loc);

   const regex = new RegExp("this\\.(value|preValue|present|prePresent)(\\.[a-zA-Z0-9_]+|\\[\\\"[a-zA-Z0-9_]\\\"\\])", "g");
   let raw_signals = code.match(regex);

   if (!raw_signals)
      return [];

   return raw_signals.map(function(el, i, arr) {
      let signalName;
      let type;
      let s = el.split(".");

      if (s[0] != "this") {
	 throw new error.InternalError("Wrong accessor parsing (1)", loc);
      } else if (s.length == 2) {
	 s = s[1].split('["');
	 type = s[0];
	 signalName = s[1].substr(0, s[1].length - 2);
      } else if (s.length == 3) {
	 type = s[1];
	 signalName = s[2];
      } else {
	 throw new error.InternalError("Wrong accessor parsing (2)", loc);
      }

      return makeAccessor(signalName, type);
   });
}
exports.get_accessor_list = get_accessor_list;

//
// Helper function telling if nodebug keyword is present on the attrs
// of the node. If it is present, it is removed and the function
// return true. Return false otherwise.
//
// We can't use get_arguments to get this information since
// get_argument is not used for all HH instructions.
//
// This function is useless for instructions using get_arguments.
//
const has_nodebug_kwd = function(attrs) {
   if (!attrs)
      return false;

   for (let key in attrs) {
      if (key.toLowerCase() == "nodebug") {
	 delete attrs[key];
	 return true;
      }
   }

   return false;
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
// `nodebug` the instruction should be hidden on debugger
//
const get_arguments = function(attrs, loc) {
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
      accessor_list_count: [],
      nodebug: false
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
      if (!(raw.apply instanceof Function))
	 throw new error.SyntaxError("apply must be a function.", loc);
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

   let hasFlag = kwd => raw.hasOwnProperty(kwd) && raw[kwd] == "";
   args.immediate = hasFlag("immediate");
   args.pre = hasFlag("pre");
   args.signal_name_list = get_signal_name_list(attrs, loc);
   args.id = raw.id;
   args.not = hasFlag("not");
   args.nodebug = hasFlag("nodebug");

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

   if (signal_name) {
      args.accessor_list[0] =
	 makeAccessor(signal_name, (args.pre ? "prePresent" : "present"));
   } else if (!args.func) {
      throw new error.SyntaxError("Missing signal or missing expression.", loc);
   }

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
	    let ifapply = attrs[name];

	    if (if_exists)
	       _error_exclusive();
	    if_exists = true;

	    if (!(ifapply instanceof Function))
	       throw new error.SyntaxError("ifApply must be a function.", loc);
	    args.if_func = ifapply;
	    args.if_accessor_list = get_accessor_list(ifapply, loc);
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
   return new ast.Sequence(null, format_loc(attrs), true, children);
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
      if (isHiphopInstruction(raw[i]))
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

function MODULE(attrs={}) {
   let loc = format_loc(attrs);
   let children = get_children_min(arguments, 1);
   return new ast.Module(attrs.id, loc, attrs.name,
			 get_signal_declaration_list(attrs, loc),
			 make_implicit_sequence(attrs, children));
}
exports.MODULE = MODULE;

function LOCAL(attrs={}) {
   let loc = format_loc(attrs);
   let children = get_children_min(arguments, 1);
   return new ast.Local(attrs.id, loc, has_nodebug_kwd(attrs),
			get_signal_declaration_list(attrs, loc),
			make_implicit_sequence(attrs, children));
}
exports.LOCAL = LOCAL;

function EMIT(attrs={}) {
   let args = get_arguments_emit_node(attrs);
   check_no_children(arguments);
   return new ast.Emit(args.id, args.loc, args.nodebug, args.signal_name_list,
		       args.func, args.accessor_list, args.if_func,
		       args.if_accessor_list);
}
exports.EMIT = EMIT;

function SUSTAIN(attrs={}) {
   let args = get_arguments_emit_node(attrs);
   check_no_children(arguments);
   return new ast.Sustain(args.id, args.loc, args.nodebug,
			  args.signal_name_list, args.func,
			  args.accessor_list, args.if_func,
			  args.if_accessor_list);
}
exports.SUSTAIN = SUSTAIN;

function IF(attrs={}) {
   let loc = format_loc(attrs);
   let args = get_arguments_expression_node(attrs);
   let children = get_children(arguments, 1, 2);
   return new ast.If(args.id, loc, args.nodebug, [children[0], children[1]],
   		     args.not, args.func, args.accessor_list);
}
exports.IF = IF;

function NOTHING(attrs={}) {
   check_no_children(arguments);
   return new ast.Nothing(attrs.id, format_loc(attrs), has_nodebug_kwd(attrs));
}
exports.NOTHING = NOTHING;

function PAUSE(attrs={}) {
   check_no_children(arguments);
   return new ast.Pause(attrs.id, format_loc(attrs), has_nodebug_kwd(attrs));
}
exports.PAUSE = PAUSE;

function HALT(attrs={}) {
   check_no_children(arguments);
   return new ast.Halt(attrs.id, format_loc(attrs), has_nodebug_kwd(attrs));
}
exports.HALT = HALT;

function AWAIT(attrs={}) {
   let args = get_arguments_count_expression_node(attrs);
   check_no_children(arguments);
   return new ast.Await(args.id, args.loc, args.nodebug, args.func,
			args.accessor_list, args.immediate,
			args.func_count, args.accessor_list_count);
}
exports.AWAIT = AWAIT;

function PARALLEL(attrs={}) {
   let children = get_children_min(arguments, 1);
   return new ast.Parallel(attrs.id, format_loc(attrs), has_nodebug_kwd(attrs),
			   children);
}
exports.PARALLEL = PARALLEL;

function ABORT(attrs={}) {
   let args = get_arguments_count_expression_node(attrs);
   let children = get_children_min(arguments, 1);
   return new ast.Abort(args.id, args.loc, args.nodebug, args.func,
			args.accessor_list, args.immediate,
			args.func_count, args.accessor_list_count,
			make_implicit_sequence(attrs, children));
}
exports.ABORT = ABORT;

function WEAKABORT(attrs={}) {
   let args = get_arguments_count_expression_node(attrs);
   let children = get_children_min(arguments, 1);
   return new ast.WeakAbort(args.id, args.loc, args.nodebug,
   			    args.func, args.accessor_list, args.immediate,
   			    args.func_count, args.accessor_list_count,
   			    make_implicit_sequence(attrs, children));
}
exports.WEAKABORT = WEAKABORT;

function SUSPEND_(attrs={}) {
   let args = get_arguments_expression_node(attrs);
   let children = get_children_min(arguments, 1);
   return new ast.Suspend(args.id, args.loc, args.nodebug,
			  make_implicit_sequence(attrs, children),
			  args.func, args.accessor_list, args.immediate);
}

//
// TODO: the suspend macro should be expanded at AST level (in order
// to be transparant for debugger users). See example of WeakAbort in
// ast.js
//
function SUSPEND(attrs={}) {
   let sig_list = get_signal_name_list(attrs, format_loc(attrs));
   let signal_name = sig_list[0];
   let loc = format_loc(attrs);

   delete attrs[signal_name];
   for (let key in attrs) {
      attrs[key.toLowerCase()] = attrs[key];
   }

   let condFrom = attrs.from || attrs.fromapply || attrs.fromvalue;
   let condToogle = attrs.tooglesignal || attrs.toogleapply || attrs.tooglevalue;
   let condRegular = attrs.apply || attrs.value;
   if (sig_list.length == 0 && !condFrom && !condRegular && !condToogle) {
      throw new error.SyntaxError("Missing suspend condition.",
				  loc);
   } else if ((condFrom && condToogle) || (condFrom && condRegular)
	      || (condToogle && condRegular)) {
      throw new error.SyntaxError("Cannot use suspend-from/-toogle/apply/value"
				  + " together", loc);
   } else if (condFrom && signal_name) {
      throw new error.SyntaxError("Cannot use suspend-from with a signal.",
				  loc);
   } else if (condToogle && signal_name) {
      throw new error.SyntaxError("Cannot use suspend-toogle with a signal.",
				  loc);
   } else if (condRegular && signal_name) {
      throw new error.SyntaxError("Cannot use suspend with apply/value and a signal.",
				  loc);
   } else if (sig_list.length > 1) {
      throw new error.SyntaxError("Suspend cannot have more than 1 signal.",
				  loc);
   }


   if (("from" in attrs || "fromapply" in attrs || "fromvalue" in attrs) &&
       ("to" in attrs || "toapply" in attrs || "tovalue" in attrs)) {
      //
      // Handle the suspend-from-to
      //
      return <hh.local SUSPEND_CONTINUOUS nodebug>
	<hh.trap END_BODY nodebug>
	  <hh.parallel nodebug>

	    <hh.sequence nodebug>
	      <suspend_ immediate SUSPEND_CONTINUOUS>
	        ${expandChildren(arguments)}
	      </suspend_>
	      <hh.exit END_BODY  nodebug/>
	    </hh.sequence>

	    <hh.every signal=${attrs.from} immediate=${attrs.immediate}
	              apply=${attrs.fromapply} value=${attrs.fromvalue}
                      nodebug>
	      <hh.abort signal=${attrs.to}
			apply=${attrs.toapply}
			value=${attrs.tovalue} nodebug>
		<hh.parallel nodebug>
			<hh.sustain SUSPEND_CONTINUOUS nodebug/>
			${(attrs.emitWhenSuspended
			   ? <hh.sustain ${attrs.emitwhensuspended} nodebug/>
			   : undefined)}
		</hh.parallel>
	      </hh.abort>
	    </hh.every>

          </hh.parallel>
	</hh.trap>
      </hh.local>;
   } else if ("tooglesignal" in attrs
	      || "tooglevalue" in attrs
	      || "toogleapply" in attrs) {
      return <hh.local SUSPEND_CONTINUOUS nodebug>
	<hh.trap END_BODY nodebug>
	  <hh.parallel nodebug>

	    <hh.sequence nodebug>
	      <suspend_ immediate SUSPEND_CONTINUOUS>
	        ${expandChildren(arguments)}
	      </suspend_>
	      <hh.exit END_BODY  nodebug/>
	    </hh.sequence>

	    <hh.loop>
	      <hh.await immediate=${attrs.immediate}
			signal=${attrs.tooglesignal}
			apply=${attrs.toogleapply}
			value=${attrs.tooglevalue} nodebug/>
	      <hh.abort signal=${attrs.tooglesignal}
			apply=${attrs.toogleapply}
			value=${attrs.tooglevalue} nodebug>
		<hh.parallel nodebug>
		  <hh.sustain SUSPEND_CONTINUOUS nodebug/>
			${(attrs.emitWhenSuspended
			   ? <hh.sustain ${attrs.emitwhensuspended} nodebug/>
			   : undefined)}
		</hh.parallel>
	      </hh.abort>
	      <hh.pause/>
	    </hh.loop>
          </hh.parallel>
	</hh.trap>
      </hh.local>;
   } else {
      return <suspend_ apply=${attrs.apply} value=${attrs.value}
                           signal=${signal_name}
			   immediate=${attrs.immediate}>
         ${expandChildren(arguments)}
      </suspend_>;
   }
}
exports.SUSPEND = SUSPEND;

function LOOP(attrs={}) {
   let children = get_children_min(arguments, 1);
   return new ast.Loop(attrs.id, format_loc(attrs), has_nodebug_kwd(attrs),
		       make_implicit_sequence(attrs, children));
}
exports.LOOP = LOOP;

function LOOPEACH(attrs={}) {
   let args = get_arguments_count_expression_node(attrs);
   let children = get_children_min(arguments, 1);
   return new ast.LoopEach(args.id, args.loc, args.nodebug,
			   make_implicit_sequence(attrs, children),
			   args.func, args.accessor_list,
			   args.func_count, args.accessor_list_count);
}
exports.LOOPEACH = LOOPEACH;

function EVERY(attrs={}) {
   let args = get_arguments_count_expression_node(attrs);
   let children = get_children_min(arguments, 1);
   return new ast.Every(args.id, args.loc, args.nodebug,
			make_implicit_sequence(attrs, children), args.func,
			args.accessor_list, args.immediate, args.func_count,
			args.accessor_list_count);
}
exports.EVERY = EVERY;

function SEQUENCE(attrs={}) {
   let children = get_children_min(arguments, 1);
   return new ast.Sequence(attrs.id, format_loc(attrs), has_nodebug_kwd(attrs),
			   children);
}
exports.SEQUENCE = SEQUENCE;

function ATOM(attrs={}) {
   let args = get_arguments_action_node(attrs);
   check_no_children(arguments);
   return new ast.Atom(args.id, args.loc, args.nodebug, args.func,
		       args.accessor_list);
}
exports.ATOM = ATOM;

function TRAP(attrs={}) {
   let children = get_children_min(arguments, 1);
   return new ast.Trap(attrs.id, format_loc(attrs), has_nodebug_kwd(attrs),
		       get_trap_name(attrs),
		       make_implicit_sequence(attrs, children));
}
exports.TRAP = TRAP;

function EXIT(attrs={}) {
   check_no_children(arguments);
   return new ast.Exit(attrs.id, format_loc(attrs), has_nodebug_kwd(attrs),
		       get_trap_name(attrs));
}
exports.EXIT = EXIT;

function RUN(attrs={}) {
   let loc = format_loc(attrs);

   if (!attrs.module || !(attrs.module instanceof ast.Module))
      throw new error.SyntaxError("`module` must be a Hiphop.js module", loc);

   let module = attrs.module.clone();
   let signal_declaration_list = module.signal_declaration_list;

   check_no_children(arguments);
   for (let sig in signal_declaration_list) {
      let sigdecl = signal_declaration_list[sig];
      let sigbound = attrs[sigdecl.name];

      if (sigbound) {
	 if (typeof(sigbound) != "string" && !(sigbound instanceof String)) {
	    throw new error.SyntaxError("String expected on signal " +
					sigdecl.name + " bounding.", loc);
	 } else {
	    sigdecl.bound = sigbound;
	 }
      } else {
	 //
	 // Implicit bound to a signal with the same name, or no bound
	 // at all (if signal with same name didn't exists at compile
	 // time).
	 //
	 sigdecl.bound = -1;
      }
   }

   let body = new ast.Local(attrs.id, loc, false, signal_declaration_list,
			    make_implicit_sequence(attrs, module.children));
   body.in_run_context = true;
   return new ast.Run(attrs.id, loc, module.name, has_nodebug_kwd(attrs), body);
}
exports.RUN = RUN;

function EXEC(attrs={}) {
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

   return new ast.Exec(args.id, args.loc, args.nodebug,
		       args.signal_name_list[0], args.func,
		       args.accessor_list, attrs.res, attrs.susp, attrs.kill);
}
exports.EXEC = EXEC;

//
// Helper function generating signal accessors
//
function makeAccessor(signalName, type) {
   switch(type) {
   case "value":
      return new ast.SignalAccessor(signalName, false, true);
   case "preValue":
      return new ast.SignalAccessor(signalName, true, true);
   case "present":
      return new ast.SignalAccessor(signalName, false, false);
   case "prePresent":
	 return new ast.SignalAccessor(signalName, true, false);
   default:
      throw new error.InternalError("Wrong type makeAccessor.", loc);
   }
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
