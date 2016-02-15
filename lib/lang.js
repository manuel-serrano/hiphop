"use hopscript"

/* TODO:
   - fix broken RUN
*/

const ast = require("./ast.js");
const error = require("./error.js");

function format_loc(attrs) {
   let loc = attrs != undefined ? attrs["%location"] : undefined;

   if (loc != undefined)
      return loc.filename + ":" + loc.pos;
   return "[LOC DISABLED --- run hop -g to get location]";
}

function get_children(args) {
   let children = [];
   let raw_children = Array.prototype.slice.call(args, 1, args.length);

   for (let i in raw_children)
      if (raw_children[i] instanceof ast.ASTNode)
	 children.push(raw_children[i]);
   return children;
}

/* Check that direct children on an instruction dosen't contains global
   signals (we assert that it must be ASTNode, thanks to get_children */
function check_children(children) {
   for (let i in children) {
      if (children[i] instanceof ast.InputSignal
	  || children[i] instanceof ast.OutputSignal)
	 throw new error.SyntaxError("Global signal are not allowed here.",
				     children[i].loc);
   }
}

function check_expressions(loc, func, exprs) {
   type_test(func, Function, loc);
   type_test(exprs, Array, loc);

   if (func && exprs) {
      if (func.length != exprs.length)
	 throw new error.SyntaxError("The arity of `func` is " + func.length
				     + " but the arity of `exprs` is "
				     + exprs.length + ".", loc)
   } else if (func) {
      if (func.length > 0)
	 throw new error.SyntaxError("The arity of `func` is " + func.length
				     + " but no expression is given.", loc);
   } else if (exprs) {
      if (exprs.length > 1)
	 throw new error.SyntaxError("Missing `func` callback, with needed"
				     +" arity of " + exprs.length + ".", loc);
   }

}

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
	 throw new error.SyntaxError("Unexpected attribute: `"
				     + name + "`", loc);
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

function MODULE(attrs) {
   attrs = check_attributes(attrs, undefined, undefined);
   let loc = format_loc(attrs);
   let children = get_children(arguments);
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
	    throw new error.SyntaxError("Name of InputSignal `"
					+ name + "` already used.", loc);
	 inputs.push(child);
      } else {
	 if (inputs.indexOf(child.name) > -1
	     || outputs.indexOf(child.name) > -1)
	    throw new error.SyntaxError("Name of OutputSignal `"
					+ name + "` already used.", loc);
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
	    throw new error.SyntaxError("Can't use innput/output signal"
					+ "declaration inside reactive"
					+ " instruction code.",
					children[i].loc);
	 throw new error.SyntaxError("Unknown instruction `" + children[i]
				     + "`", format_loc(attrs));
      }

   children = children.slice(0, j);
   if (stmts.length > 1)
      children = children.concat(implicit_sequence(attrs, stmts));
   else
      children.push(stmts[0]);
   return new ast.Module(loc, children);
}

exports.MODULE = MODULE;

function parse_exprs(raw_exprs) {
   let exprs = [];

   if (raw_exprs != undefined) {
      if (raw_exprs instanceof Array)
	 for (let expr in raw_exprs)
	    exprs.push(parse_value(raw_exprs[expr]));
      else
	 exprs.push(parse_value(raw_exprs))
   }

   return exprs;
}

function EMIT(attrs) {
   let loc = format_loc(attrs);
   let exprs;
   let func;

   attrs = check_attributes(attrs, ["signal_name"], ["func", "exprs"]);
   exprs = parse_exprs(attrs.exprs);
   func = attrs.func;
   check_expressions(loc, func, exprs);

   for (let name in exprs) {
      let expr = exprs[name];

      if (expr instanceof SignalAccessor
	  && expr.signal_name == attrs.signal_name
	  && !expr.get_pre)
	 throw new SignalError("Can't get current value of a signal to"
			       + " update itself.", attrs.signal_name, loc);
   }
   return new ast.Emit(attrs.id, loc, attrs.signal_name, func, exprs);
}

exports.EMIT = EMIT;

function SUSTAIN(attrs) {
   let loc = format_loc(attrs);
   let exprs;
   let func;

   attrs = check_attributes(attrs, ["signal_name"], ["func", "exprs"]);
   exprs = parse_exprs(attrs.exprs);
   func = attrs.func;
   check_expressions(loc, func, exprs);
   return new ast.Sustain(attrs.id, loc, attrs.signal_name, func, exprs);
}

exports.SUSTAIN = SUSTAIN;

function IF(attrs) {
   let loc = format_loc(attrs);
   let children = get_children(arguments);
   let func;
   let exprs;

   if (children.length < 1)
      throw new error.SyntaxError("`If` must have at leat one child.", loc);
   attrs = check_attributes(attrs, ["exprs"], ["func", "not"]);
   exprs = parse_exprs(attrs.exprs);
   func = attrs.func;
   check_expressions(loc, func, exprs);
   check_children(children);
   return new ast.If(attrs.id,
		     loc,
   		     attrs.not != undefined,
   		     func,
   		     exprs,
   		     [children[0], children[1]]);
}

exports.IF = IF;

function NOTHING(attrs) {
   attrs = check_attributes(attrs, undefined, undefined);
   return new ast.Nothing(attrs.id, format_loc(attrs));
}

exports.NOTHING = NOTHING;

function PAUSE(attrs) {
   attrs = check_attributes(attrs, undefined, undefined);
   return new ast.Pause(attrs.id, format_loc(attrs));
}

exports.PAUSE = PAUSE;

function HALT(attrs) {
   attrs = check_attributes(attrs, undefined, undefined);
   return new ast.Halt(attrs.id, format_loc(attrs));
}

exports.HALT = HALT;

function PRESENT(attrs) {
   let loc = format_loc(attrs);
   let children = get_children(arguments);

   check_children(children);
   attrs = check_attributes(attrs, ["signal_name"], ["test_pre", "not"]);
   if (children.length < 1)
      throw new error.SyntaxError("Present must have at least one child.",
				  loc);
   return new ast.If(attrs.id,
		     loc,
		     attrs.not != undefined,
		     undefined,
		     [present(attrs.signal_name)],
		     [children[0], children[1]])
}

exports.PRESENT = PRESENT;

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

exports.AWAIT = AWAIT;

function PARALLEL(attrs) {
   attrs = check_attributes(attrs, undefined, undefined);
   let children = get_children(arguments);

   check_children(children);
   if (children.length < 1)
      throw new error.SyntaxError("Parallel must have at least one child.",
				  format_loc(attrs));
   return new ast.Parallel(attrs.id, format_loc(attrs), children);
}

exports.PARALLEL = PARALLEL;

function ABORT(attrs) {
   let children = get_children(arguments);

   check_children(children);
   attrs = check_attributes(attrs,
			    ["signal_name"],
			    ["test_pre", "weak", "immediate", "count"]);
   return new ast.Abort(attrs.id,
			format_loc(attrs),
			attrs.signal_name,
			attrs.test_pre != undefined,
			attrs.immediate != undefined,
			parse_count(attrs, attrs.count),
			implicit_sequence(attrs, children));
}

exports.ABORT = ABORT;

function SUSPEND(attrs) {
   let children = get_children(arguments);

   check_children(children);
   attrs = check_attributes(attrs, ["signal_name"], ["test_pre"]);
   return new ast.Suspend(attrs.id,
			  format_loc(attrs),
			  attrs.signal_name,
			  attrs.test_pre != undefined,
			  implicit_sequence(attrs, children));
}

exports.SUSPEND = SUSPEND;

function LOOP(attrs) {
   let children = get_children(arguments);

   check_children(children);
   attrs = check_attributes(attrs, undefined, undefined);
   return new ast.Loop(attrs.id,
		       format_loc(attrs),
		       implicit_sequence(attrs, children));
}

exports.LOOP = LOOP;

function LOOPEACH(attrs) {
   let children = get_children(arguments);

   check_children(children);
   attrs = check_attributes(attrs, ["signal_name"], ["test_pre", "count"]);
   return new ast.LoopEach(attrs.id,
			   format_loc(attrs),
			   implicit_sequence(attrs, children),
			   attrs.signal_name,
			   attrs.test_pre != undefined,
			   parse_count(attrs, attrs.count));
}

exports.LOOPEACH = LOOPEACH;

function EVERY(attrs) {
   let children = get_children(arguments);

   check_children(children);
   attrs = check_attributes(attrs, ["signal_name"], ["immediate", "count"]);
   return new ast.Every(attrs.id,
			format_loc(attrs),
			implicit_sequence(attrs, children),
			attrs.signal_name,
			parse_count(attrs, attrs.count),
			attrs.immediate != undefined)
}

exports.EVERY = EVERY;

function SEQUENCE(attrs) {
   let children = get_children(arguments);

   check_children(children);
   attrs = check_attributes(attrs, undefined, undefined);
   if (children.length < 2)
      throw new error.SyntaxError("Sequence must have at least two children.",
				  format_loc(attrs));
   return new ast.Sequence(attrs.id, format_loc(attrs), children);
}

exports.SEQUENCE = SEQUENCE;

function ATOM(attrs) {
   let loc = format_loc(attrs);
   let exprs;
   let func;

   attrs = check_attributes(attrs, ["func"], ["exprs"]);
   exprs = parse_exprs(attrs.exprs);
   func = attrs.func;
   check_expressions(loc, func, exprs);
   return new ast.Atom(attrs.id, loc, func, exprs);
}

exports.ATOM = ATOM;

function TRAP(attrs) {
   let children = get_children(arguments);

   check_children(children);
   check_attributes(attrs, ["trap_name"], undefined);
   return new ast.Trap(attrs.id,
		       format_loc(attrs),
		       attrs.trap_name,
		       implicit_sequence(attrs, children));
}

exports.TRAP = TRAP;

function EXIT(attrs) {
   check_attributes(attrs, ["trap_name"], undefined);
   return new ast.Exit(attrs.id, format_loc(attrs), attrs.trap_name);
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
   return new ast.OutputSignal(loc,
			       sigdecl.name,
			       sigdecl.type,
			       sigdecl.init_value,
			       sigdecl.combine_with,
			       sigdecl.valued);
}

exports.OUTPUTSIGNAL = OUTPUTSIGNAL;

function LOCALSIGNAL(attrs) {
   let children = get_children(arguments);
   let loc = format_loc(attrs);
   let sigdecl = init_signal_declaration(attrs, loc, ["name"], ["id",
								"type",
								"init_value",
								"combine_with",
								"valued"]);

   check_children(children);
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

function type_test(value, type, loc) {
   let wrong_type = false;

   if (value == undefined || value == null) {
      return;
   } else if (typeof(value) == "object" || typeof(value) == "function") {
      if (!(value instanceof type))
	 wrong_type = true;
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
