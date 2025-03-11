/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/lang.js                   */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal                                       */
/*    Creation    :  Mon Jul 16 11:12:00 2018                          */
/*    Last change :  Thu Feb 20 13:25:45 2025 (serrano)                */
/*    Copyright   :  2018-25 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    HipHop language definition                                       */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
import * as error from "./error.js";
import * as ast from "./ast.js";
import { ReactiveMachine } from "./machine.js";

export { KEYWORDS, getAccessorList, getSignalNameList };

export {       
   MACHINE,	  
   MODULE,
   INTERFACE,
   INTF,
   FRAME,
   LOCAL,
   SIGNAL,
   EMIT,
   SUSTAIN,
   IF,
   NOTHING,
   PAUSE,
   HALT,
   AWAIT,
   SIGACCESS,
   FORK,
   FORK as PARALLEL,
   ABORT,
   WEAKABORT,
   SUSPEND,
   LOOP,
   LOOPEACH,
   EVERY,
   SEQUENCE,
   ATOM,
   TRAP,
   EXIT,
   RUN,
   EXEC 
};
       
/*---------------------------------------------------------------------*/
/*    KEYWORDS ...                                                     */
/*    -------------------------------------------------------------    */
/*    HH reserved keywords, can't be used as signal or trap names      */
/*---------------------------------------------------------------------*/
const KEYWORDS = /(\d|^)(signal|immediate|pre|%value|not|apply|countValue|countApply|resApply|suspApply|killApply|ifApply|ifValue|id|from|fromValue|fromApply|applyAccessors|countAccessors|to|toValue|toApply|toggleSignal|toggleValue|toggleApply|toggleAccessors|emitWhenSuspended|noDebug|name)(\s|$)/i;

/*---------------------------------------------------------------------*/
/*    modules and interfaces...                                        */
/*---------------------------------------------------------------------*/
let envModule = {};
let envInterface = {};


/*---------------------------------------------------------------------*/
/*    lookup ...                                                       */
/*---------------------------------------------------------------------*/
function lookup(id, loc, env) {
   if (id in env) {
      return env[id];
   } else {
      const ty = (env === envModule ? "module" : "interface");
      throw new error.ReferenceError(`${ty} "${id}" unbound`, loc);
   }
}

/*---------------------------------------------------------------------*/
/*    bind ...                                                         */
/*---------------------------------------------------------------------*/
function bind(id, mod, loc, env) {
   if (!(id in env)) {
      return env[id] = mod;
   } else {
      const ty = (env === envModule ? "module" : "interface");
      throw new error.TypeError(`${ty} "${id}" already defined`, loc);
   }
}

/*---------------------------------------------------------------------*/
/*    makeAccessor ...                                                 */
/*    -------------------------------------------------------------    */
/*    Helper function generating signal accessors                      */
/*---------------------------------------------------------------------*/
function makeAccessor(signame, type, loc) {
   switch(type) {
      case "signame":
	return new ast.SignalAccessor(signame, false, false);
      case "nowval":
	return new ast.SignalAccessor(signame, false, true);
      case "preval":
	return new ast.SignalAccessor(signame, true, true);
      case "now":
	return new ast.SignalAccessor(signame, false, false);
      case "pre":
	return new ast.SignalAccessor(signame, true, false);
      default:
	 throw error.TypeError(signame + ": Illegal signal accessor.", loc);
   }
}

/*---------------------------------------------------------------------*/
/*    flattenSignals ...                                               */
/*---------------------------------------------------------------------*/
function flattenSignals(arg, loc) {
   if (isHiphopSignal(arg)) {
      return arg;
   } else if (arg instanceof Array) {
      return arg.flatMap(a => flattenSignals(a, loc))
   } else if (isHiphopInstruction(arg)) {
      return [];
   } else if (arg instanceof ast.Interface) {
      return [];
   } else {
      throw error.TypeError(`Illegal HipHop signal \"${typeof arg === "obj" ? arg.constructor.name : arg}\".`, loc);
   };
}
      
/*---------------------------------------------------------------------*/
/*    flattenInstructions ...                                          */
/*---------------------------------------------------------------------*/
function flattenInstructions(arg, loc) {
   if (isHiphopInstruction(arg)) {
      return arg;
   } else if (arg instanceof Array) {
      return arg.flatMap(a => flattenInstructions(a, loc))
   } else if (arg instanceof ast.SignalAccessor) {
      return [];
   } else if (arg instanceof ast.SignalProperties) {
      return [];
   } else if (arg instanceof ast.Interface) {
      return [];
   } else {
      throw error.TypeError(`Illegal HipHop instruction \"${typeof arg === "obj" ? arg.constructor.name : arg}\".`, loc);
   };
}
      
/*---------------------------------------------------------------------*/
/*    attrsLoc ...                                                     */
/*---------------------------------------------------------------------*/
function attrsLoc(attrs, tag = undefined) {
   let loc = attrs["%location"];

   if (loc != undefined) {
      return loc;
   } else {
      return `[LOC DISABLED (${tag}) --- run hop -g to get location]`;
   }
}

/*---------------------------------------------------------------------*/
/*    filterFlat ...                                                   */
/*---------------------------------------------------------------------*/
function filterFlat(nodes, pred) {
   let res = [];

   for(let i = nodes.length -1; i >= 0; i--) {
      if (pred(nodes[i])) {
	 res.push(nodes[i]);
      } else if (nodes[i] instanceof Array) {
	 res = res.concat(filterFlat(nodes[i], pred));
      }
   }

   return res;
}

/*---------------------------------------------------------------------*/
/*    getSignalNameList ...                                            */
/*---------------------------------------------------------------------*/
function getSignalNameList(tag, attrs, loc) {
   let signame_list = [];

   for(let name in attrs) {
      if (name === "signame") {
	 signame_list.push(attrs[name]);
      } else if (!name.match(KEYWORDS) && name !== "%location" && name !== "%tag") {
	 signame_list.push(name);
      } else if (name.match(/^signal/i)) {
	 signame_list.push(attrs[name]);
      }
   }

   return signame_list;
}

/*---------------------------------------------------------------------*/
/*    getTrapName ...                                                  */
/*    -------------------------------------------------------------    */
/*    Get the name of a trap. It must be unique, an error is thrown    */
/*    otherwise.                                                       */
/*---------------------------------------------------------------------*/
function getTrapName(tag, attrs) {
   let loc = attrsLoc(attrs);
   let trap_name = ""

   for(let name in attrs) {
      if (!name.match(KEYWORDS) && name !== "%location" && name !== "%tag") {
	 if (trap_name == "") {
	    trap_name = name;
	 } else {
	    throw error.SyntaxError(tag + ": only one trap name expected." +
				     " At least two given: " +
				     trap_name + " " + name + ".",
				     loc);
	 }
      }
   }

   if (trap_name == "") {
      throw error.SyntaxError(tag + ": trap name is missing.", loc);
   }

   return trap_name;
}

/*---------------------------------------------------------------------*/
/*    isHiphopInstruction ...                                          */
/*    -------------------------------------------------------------    */
/*    Helper function telling is an object holds an HH instructions.   */
/*---------------------------------------------------------------------*/
function isHiphopInstruction(obj) {
   return obj instanceof ast.$ASTNode;
}

/*---------------------------------------------------------------------*/
/*    isHiphopSignal ...                                               */
/*---------------------------------------------------------------------*/
function isHiphopSignal(obj) {
   return obj instanceof ast.SignalProperties;
}

/*---------------------------------------------------------------------*/
/*    isValSignalAccessor ...                                          */
/*---------------------------------------------------------------------*/
function isValSignalAccessor(obj) {
   return (obj instanceof ast.SignalAccessor) && !obj.is_counter;
}

/*---------------------------------------------------------------------*/
/*    isCntSignalAccessor ...                                          */
/*---------------------------------------------------------------------*/
function isCntSignalAccessor(obj) {
   return (obj instanceof ast.SignalAccessor) && obj.is_counter;
}

/*---------------------------------------------------------------------*/
/*    getSignalDeclList ...                                            */
/*    -------------------------------------------------------------    */
/*    Parse MODULE and LOCAL instructions in order to return a list    */
/*    of signal declarations. These objets contain the following       */
/*    fields:                                                          */
/*                                                                     */
/*      `name` the name of the signal                                  */
/*      `accessibility` ast.IN, ast.OUT, ast.INOUT if undefined,       */
/*         ast.INOUT by default                                        */
/*      `direction` an alias for ACCESSIBILITY                         */
/*      `init_func` initialisation of signal when their scope is       */
/*         created                                                     */
/*      `init_accessor_list` list of signal accessor used in INIT_FUNC */
/*      `reinit_func` reinitialisation of signal at each reaction      */
/*      `reinit_accessor_list` list of signal accessor used in         */
/*         REINIT_FUNC                                                 */
/*      `combine` a combinaison function with arity 2                  */
/*      `alias` a signal name on which this signal is bound to         */
/*                                                                     */
/*    Signals are coming from two sources:                             */
/*       - attributes                                                  */
/*       - signal children                                             */
/*                                                                     */
/*    See ast.js for more details about these objects.                 */
/*---------------------------------------------------------------------*/
function getSignalDeclList(tag, attrs, nodes, loc) {
   let signal_declaration_list = [];

   for(let name in attrs) {
      if (name === "%location"
	  || name === "%tag"
	  || name === "id"
	  || name.toLowerCase() === "__hh_reserved_debug_name__") {
	 continue;
      }

      let prop = attrs[name];
      let init_func;
      let init_accessor_list = [];
      let reinit_func;
      let reinit_accessor_list = [];

      if (name.match(KEYWORDS)) {
	 throw error.SyntaxError(tag + ": illegal signal name (" + name + ").",
				loc);
      }

      if (prop && typeof(prop) !== "object") {
	 throw error.SyntaxError(tag + ": bad signal declaraion (" + name + ").",
				loc);
      }

      // direction is an alias for accessibility. If both are defined,
      // direction override accessibility.
      if (prop.direction) {
	 prop.accessibility = prop.direction;
      }

      if (prop.accessibility &&
	  prop.accessibility != ast.IN &&
	  prop.accessibility != ast.OUT &&
	  prop.accessibility != ast.INOUT) {
	 throw error.SyntaxError(tag +
				": signal accessibility/Direction must be " +
				"IN, OUT, or INOUT (" + name + ").",
				loc);
      }

      if (prop.initValue && prop.initApply) {
	 throw error.SyntaxError(tag + ": signal initial value must be given through " +
				"initValue or initApply. Not both (" +
				name + ").",
				loc);
      }

      if (prop.reinitValue && prop.reinitApply) {
	 throw error.SyntaxError(tag + ": reinit value must be given through " +
				"reinitValue or reinitApply. Not both (" +
				name + ").",
				loc);
      }
      
      if (prop.initApply && !(prop.initApply instanceof Function)) {
	 throw error.SyntaxError(tag + ": initApply must be a function (" +
				name + ")." , loc);
      }

      if (prop.reinitApply && !(prop.reinitApply instanceof Function)) {
	 throw error.SyntaxError(tag + ": reinitApply must be a function (" +
				name + ").", loc);
      }

      if (prop.combine) {
	 if (!(prop.combine instanceof Function)) {
	    throw error.SyntaxError(tag + ": combine must be a function (" +
				   name + ").", loc);
	 } else if (prop.combine.length != 2) {
	    throw error.SyntaxError(tag + ": bad combine function arity (" 
				     + name + "), should be 2, is " 
				     + prop.combine.length + "." , loc);
	 }
      }

      if (prop.alias &&
	  !(typeof(prop.alias) == "string"
	    || prop.alias instanceof String)) {
	 throw error.SyntaxError(tag + ": alias must be a string ("
				+ name + ").",
				loc);
      }

      if (prop.initValue !== undefined) {
	 init_func = () => prop.initValue;
      } else if (prop.initApply) {
	 init_func = prop.initApply;
	 init_accessor_list =
	    getAccessorList(init_func, prop.initAccessors, loc);
      }

      if (prop.reinitValue !== undefined) {
	 reinit_func = () => prop.reinitValue;
      } else if (prop.reinitApply) {
	 reinit_func = prop.reinitApply;
	 reinit_accessor_list =
	    getAccessorList(reinit_func,
			     undefined, // not allowed by new syntax
			     loc);
      }

      signal_declaration_list.push(
	 new ast.SignalProperties(attrs.id, loc, name,
				   prop.accessibility, init_func,
				   init_accessor_list, reinit_func,
				   reinit_accessor_list, prop.combine,
				   prop.alias));
   }

   function interfaceToSiglist(n) {
      if (n instanceof ast.Interface) {
	 return n.sigDeclList;
      } else {
	 return [];
      }
   }
   
   return signal_declaration_list
      .concat(flattenSignals(nodes, loc))
      .concat(Array.prototype.concat.apply([], nodes.map(interfaceToSiglist)));
}

/*---------------------------------------------------------------------*/
/*    getAccessorList ...                                              */
/*    -------------------------------------------------------------    */
/*    Returns a list of signal accessors, used to build dependencies   */
/*    and receiver of runtine functions.                               */
/*                                                                     */
/*    This function handles two cases:                                 */
/*                                                                     */
/*        - this.type.signal                                           */
/*        - this.type["s"]                                             */
/*                                                                     */
/*    It now (June 2018) accepts a second parameter: accessors which   */
/*    have been already parsed by preprocessor.                        */
/*---------------------------------------------------------------------*/
function getAccessorList(func, accessors, loc) {
   if (accessors) {
      return accessors.map(acc => makeAccessor(acc.name, acc.type, loc));
   }

   // legacy code ...
   if (!func)
      return [];

   let code = func.toString();

   // This regex is buggy: \s doesn't seem to work, and the
   // workaround (\t| *) in order to detect horizontal space or
   // nothing, should probably fail too in some cases...
   const regex_error = new RegExp("this(\\.[a-zA-Z0-9_]+|\\[\\\"[a-zA-Z0-9_]\\\"\\])\\.(nowval|preval|now|pre)((\t| *|.(?!=))=(?!=))", "g");

   if (code.match(regex_error)) {
      throw error.SyntaxError("A signal accessor is immutable. "
   			    + "(You may want to use EMIT instead?)", loc);
   }

   const regex = new RegExp("this(\\.[a-zA-Z0-9_]+|\\[\\\"[a-zA-Z0-9_]\\\"\\])\\.(nowval|preval|now|pre)", "g");
   let raw_signals = code.match(regex);

   if (!raw_signals)
      return [];

   return raw_signals.map(function(el, i, arr) {
      let signalName;
      let type;
      let s = el.split(".");

      if (s[0] != "this") {
	 throw error.TypeError("Wrong accessor parsing (1)", loc);
      } else if (s.length == 2) {
	 s = s[1].split('["');
	 signalName = s[0];
	 type = s[1].substr(0, s[1].length - 2);
      } else if (s.length == 3) {
	  	signalName = s[1];
	 type = s[2];
      } else {
	 throw error.TypeError("Wrong accessor parsing (2)", loc);
      }

      return makeAccessor(signalName, type, loc);
   });
}


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
// `signame_list` the name of a signal
// `func` a function to call at runtime
// `accessor_list` accessor list of signal to access at runtime
// `immediate` boolean
// `pre` boolean
// `not` boolean
// `func_count` a function to call at runtime/GO
// `accesor_list_count` accessor list of signal to access at runtime/GO
// `nodebug` the instruction should be hidden on debugger
//
function getArguments(tag, attrs, loc, raise) {
   let raw = {};
   let args = {
      loc: loc,
      id: "",
      signame_list: [],
      func: null,
      accessor_list: [],
      immediate: false,
      not: false,
      pre: false,
      func_count: null,
      accessor_list_count: [],
      nodebug: false
   };

   for (let name in attrs) {
      if (name.match(KEYWORDS)) {
	 raw[name.toLowerCase()] = attrs[name];
      }
   }

   if (raw["%value"] && raw.apply) {
      throw error.SyntaxError(tag + ": apply and %value can't be used at same time.",
			     loc);

   }
   
   if (raw.apply && !(raw.apply instanceof Function)) {
      throw error.SyntaxError(tag + ": apply must be a function.", loc);
   }

   if (raise && raw.immediate && (raw["%value"] || raw.apply)) {
      throw error.SyntaxError(tag + ": immediate can't be used with an expression.",
			     loc);
   }

   if (raise && raw.pre && (raw["%value"] || raw.apply)) {
      throw error.SyntaxError(tag + "pre can't be used with an expression.", loc);
   }

   if (raw.apply) {
      if (!(raw.apply instanceof Function))
	 throw error.SyntaxError(tag + ": apply must be a function.", loc);
      args.func = raw.apply
      args.accessor_list =
	 getAccessorList(raw.apply, raw.applyaccessors, loc);
   } else if (raw["%value"] !== undefined) {
      args.func = () => raw["%value"];
   }

   if (raw.countapply) {
      if (!(raw.countapply instanceof Function)) {
	 throw error.SyntaxError(tag + ": countApply must be a function.", loc);
      }
      args.func_count = raw.countapply;
      args.accessor_list_count =
	 getAccessorList(raw.countapply, raw.countapplyaccessors, loc);
   } else if (raw.countvalue !== undefined) {
      args.func_count = () => raw.countvalue;
   }

   let hasFlag = kwd => {
      return raw.hasOwnProperty(kwd)
	 && ((raw[kwd] == "" && (typeof raw[kwd] == "string"))
	     || raw[kwd] === true);
   }
   
   args.immediate = hasFlag("immediate");
   args.pre = hasFlag("pre");
   args.signame_list = getSignalNameList(tag, attrs, loc);
   args.id = raw.id;
   args.not = hasFlag("not");
   args.nodebug = hasFlag("nodebug");

   return args;
}

/*---------------------------------------------------------------------*/
/*    getArgumentsActionNode ...                                       */
/*    -------------------------------------------------------------    */
/*    Gets arguments of action node and check their validity.          */
/*---------------------------------------------------------------------*/
function getArgumentsActionNode(tag, attrs, raise) {
   const loc = attrsLoc(attrs);
   let args = getArguments(tag, attrs, loc, raise);

   if (!args.func) {
      throw error.SyntaxError(tag + ": missing `apply' attribute.", loc);
   }

   return args;
}

/*---------------------------------------------------------------------*/
/*    mergeAccessors ...                                               */
/*---------------------------------------------------------------------*/
function mergeAccessors(l1, l2) {
   // remove from l2 the accessors of l1
   const l = l2.filter(a2 => !l1.find(a1 => a1.signame === a2.signame));
   return l1.concat(l);
}

/*---------------------------------------------------------------------*/
/*    getArgumentsExpressionNode ...                                   */
/*    -------------------------------------------------------------    */
/*    Gets arguments of (count)expression node and check their         */
/*    validity.                                                        */
/*---------------------------------------------------------------------*/
function getArgumentsExpressionNode(tag, attrs, loc, axs) {
   const raise = axs.length == 0;
   
   if (!loc) loc = attrsLoc(attrs);

   let args = getArguments(tag, attrs, loc, raise);
   let signame = args.signame_list[0];

   args.accessor_list = mergeAccessors(axs, args.accessor_list);

   if (args.signame_list.length > 1) {
      throw error.SyntaxError(tag + ": only one signal name expected. " +
			     args.signame_list.length + " given: " +
			     args.signame_list,
			     loc);
   }

   if (signame && args.func) {
      throw error.SyntaxError(tag + ": expressions can take a signal or " +
			     "an expression. Not both.",
			     loc);
   }

   if (signame) {
      args.accessor_list[0] =
	 makeAccessor(signame, (args.pre ? "pre" : "now"), loc);
   } else if (!args.func && raise) {
      throw error.SyntaxError(tag + ": missing signal or missing expression.",
			       loc);
   }

   if (args.pre && !signame) {
      throw error.SyntaxError(tag + ": can't use pre without signal.", loc);
   }

   return args;
}

/*---------------------------------------------------------------------*/
/*    getArgumentsCountExpressionNode ...                              */
/*    -------------------------------------------------------------    */
/*    Gets arguments of count expression node and check their          */
/*    validity.                                                        */
/*---------------------------------------------------------------------*/
function getArgumentsCountExpressionNode(tag, attrs, axs, cntaxs) {
   let loc = attrsLoc(attrs);
   let args = getArgumentsExpressionNode(tag, attrs, loc, axs);

   if (args.immediate && args.func_count)
      throw error.SyntaxError(tag + ": can't use immediate with count expression.",
			     loc);

   args.accessor_list_count = mergeAccessors(cntaxs, args.accessor_list_count);
   return args;
}

/*---------------------------------------------------------------------*/
/*    checkArgumentsAccessors ...                                      */
/*---------------------------------------------------------------------*/
function checkArgumentsAccessors(tag, args, loc) {
   return true;
/*    if (args.accessor_list.length == 0 && args.accessor_list_count.length == 0) { */
/*       throw error.TypeError("AWAIT: missing signal", args.loc);   */
/*    }                                                                */
}
   
/*---------------------------------------------------------------------*/
/*    checkAccessorList ...                                            */
/*---------------------------------------------------------------------*/
function checkAccessorList(tag, loc, sns, axs, exec_context=false) {
   axs.forEach(acc => {
      sns.forEach(sn => {
	 if (acc.signame === sn && !acc.get_pre && !exec_context) {
	    throw error.SyntaxError(tag + ": can't get current value of a " +
				     "signal to update itself. " +
				     "(missing pre?)",
	       loc);
	 }
      })
   })

   return axs;
}
/*---------------------------------------------------------------------*/
/*    getEmitNodeArguments ...                                         */
/*    -------------------------------------------------------------    */
/*    Gets arguments of emit node and check their validity.            */
/*---------------------------------------------------------------------*/
function getEmitNodeArguments(tag, attrs, axs, cntaxs, exec_context=false) {
   const loc = attrsLoc(attrs);
   const ctxt = exec_context ? "exec" : "emit";
   const args = getArguments(tag, attrs, loc, true);
   const signame_list =
	 args.signame_list
	 .concat(axs.map(a => a.signame))
	 .concat(cntaxs.map(a => a.signame));

   if (signame_list.length == 0 && !exec_context) {
      throw error.SyntaxError(tag + ": signal name is missing.", loc);
   }

   if (args.func_count) {
      throw error.SyntaxError(tag + ": counter expression can't be used in " +
			     ctxt + ".", loc);
   }

   if (args.pre) {
      throw error.SyntaxError(tag + ": pre can't be used in " + ctxt + ".", loc);
   }

   if (args.immediate) {
      throw error.SyntaxError(tag + ": immediate can't be used in " + ctxt + ".",
			     loc);
   }

   if (!exec_context) {
      args.if_accessor_list = [];

      for(let name in attrs) {
	 function _error_exclusive() {
	    throw error.SyntaxError(tag + ": ifApply and ifValue are exclusives.",
				   loc);
	 }
	 let if_exists = false;

	 if (name.toLowerCase() === "ifapply") {
	    let ifapply = attrs[name];

	    if (if_exists) _error_exclusive();
	    if_exists = true;

	    if (!(ifapply instanceof Function)) {
	       throw error.SyntaxError(tag + ": ifApply must be a function.",
				      loc);
	    }
	    args.if_func = ifapply;
	    args.if_accessor_list = getAccessorList(ifapply, undefined, loc);
	 }

	 if (name.toLowerCase() === "ifvalue") {
	    if (if_exists) _error_exclusive();
	    if_exists = true;
	    args.if_func = () => attrs[name];
	 }
      }
   }

   args.accessor_list =
      checkAccessorList(tag, loc, args.signame_list,
			 mergeAccessors(axs, args.accessor_list));

   if (args.if_accessor_list) {
      args.if_accessor_list =
	 checkAccessorList(tag, loc, args.signame_list,
			    mergeAccessors(cntaxs, args.if_accessor_list));
   } else if (cntaxs) {
      args.if_accessor_list =
	 checkAccessorList(tag, loc, args.signame_list, cntaxs);
   }

   return args;
}

/*---------------------------------------------------------------------*/
/*    makeImplicitSequence ...                                         */
/*    -------------------------------------------------------------    */
/*    Build an implicit sequence from a list of HH instructions.       */
/*---------------------------------------------------------------------*/
function makeImplicitSequence(attrs, children) {
   if (children.length <= 1) {
      return children;
   } else {
      const loc = children[0].loc || attrsLoc(attrs);
      return [new ast.Sequence("SEQUENCE", null, loc, true, children)];
   }
}

/*---------------------------------------------------------------------*/
/*    checkChildren ...                                                */
/*---------------------------------------------------------------------*/
function checkChildren(tag, attrs, args, min, max, loc) {
   let children = flattenInstructions(args, loc);
      
   if (children.length === 0 && min < 0) {
      return [NOTHING(attrs)];
   } else if (children.length < min || (max > -1 && children.length > max)) {
      let msg = "arity error; expected ";

      if (min > -1 && max > -1) {
	 msg += "min " + min + " max " + max;
      } else if (min > -1) {
	 msg += "min " + min;
      } else if (max > -1) {
	 msg += "max " + max;
      } else {
	 msg += `[${min}..${max}]`;
      }

      msg += ", but " + children.length + " given."

      throw error.SyntaxError(tag + ": " + msg, attrsLoc(attrs)); 
   }

   return children;
}
   
/*---------------------------------------------------------------------*/
/*    checkNoChildren ...                                              */
/*---------------------------------------------------------------------*/
function checkNoChildren(tag, attrs, args, loc) {
   return checkChildren(tag, attrs, args, 0, 0, loc);
}

/*---------------------------------------------------------------------*/
/*    checkChildrenMin ...                                             */
/*---------------------------------------------------------------------*/
function checkChildrenMin(tag, attrs, args, min, loc) {
   return checkChildren(tag, attrs, args, min, -1, loc);
}

/*---------------------------------------------------------------------*/
/*    MODULE ...                                                       */
/*---------------------------------------------------------------------*/
function MODULE(attrs={}, ...nodes) {
   const tag = attrs["%tag"] || "LOCAL";
   const loc = attrsLoc(attrs, tag);
   const children = checkChildrenMin("MODULE", attrs, nodes, 1, loc);
   const mod = new ast.Module(tag, attrs.id, loc,
      attrs.__hh_reserved_debug_name__,
      getSignalDeclList(tag, attrs, nodes, loc),
      makeImplicitSequence(attrs, children));

   return mod;
}

/*---------------------------------------------------------------------*/
/*    FRAME ...                                                        */
/*---------------------------------------------------------------------*/
function FRAME(attrs={}, ...nodes) {
   const tag = attrs["%tag"] || "FRAME";
   const loc = attrsLoc(attrs, tag);
   checkNoChildren(tag, attrs, nodes, loc);
   
   return new ast.Frame(tag, attrs.id, loc, attrs.fun);
}

/*---------------------------------------------------------------------*/
/*    MACHINE ...                                                      */
/*---------------------------------------------------------------------*/
function MACHINE(attrs={}, ...nodes) {
   const tag = attrs["%tag"] || "LOCAL";
   const loc = attrsLoc(attrs, tag);
   const children = checkChildrenMin("MACHINE", attrs, nodes, 1, loc);

   return new ReactiveMachine(
      new ast.Module(tag, attrs.id, attrsLoc(attrs),
		      attrs.__hh_reserved_debug_name__,
		      getSignalDeclList(tag, attrs, nodes, loc),
		      makeImplicitSequence(attrs, children)));
}

/*---------------------------------------------------------------------*/
/*    INTERFACE ...                                                    */
/*---------------------------------------------------------------------*/
function INTERFACE(attrs={}, ...nodes) {
   const tag = attrs["%tag"] || "interface";
   const loc = attrsLoc(attrs, tag);

   const sig = getSignalDeclList(tag, attrs, nodes, attrsLoc(attrs, tag));
   
   const intf = new ast.Interface(attrs.id, sig, false);
   
   return intf;
}

/*---------------------------------------------------------------------*/
/*    INTF ...                                                         */
/*---------------------------------------------------------------------*/
function INTF(attrs={}, ...nodes) {
   const id = attrs.id;
   const loc = attrs["%location"];
   let intf = attrs["%value"];

   if (!(intf instanceof ast.Interface)) {
      // the provided interface is a mere JS data structure
      const signals = Object.keys(intf)
	 .map(key => {
	    const val = intf[key];
	    return SIGNAL({
	       "%location": loc,
	       name: key,
	       direction: val?.direction ?? "INOUT",
	       init_func: val?.init,
	       combine_func: val?.combine,
	       reinit_func: val?.transient ? (val?.init ?? (() => undefined)) : undefined
	    });
	 });
      intf = INTERFACE(... [{ id: id, "%location": loc }].concat(signals));
   }
      
							 
   if (attrs.mirror) {
      return new ast.Interface(intf.id, intf.sigDeclList, true);
   } else {
      return intf;
   }
}

/*---------------------------------------------------------------------*/
/*    LOCAL ...                                                        */
/*---------------------------------------------------------------------*/
function LOCAL(attrs={}, ...nodes) {
   const tag = attrs["%tag"] || "LOCAL";
   const loc = attrsLoc(attrs, tag);
   const children = checkChildrenMin("LOCAL", attrs, nodes, 1, loc);

   return new ast.Local(tag, attrs.id, attrsLoc(attrs, tag),
			 has_nodebug_kwd(attrs),
			 getSignalDeclList(tag, attrs, nodes, loc),
			 makeImplicitSequence(attrs, children));
}

/*---------------------------------------------------------------------*/
/*    SIGNAL ...                                                       */
/*---------------------------------------------------------------------*/
function SIGNAL(attrs={}, ...nodes) {
   const loc = attrsLoc(attrs, "SIGNAL");
   let dir = ast.INOUT;
   const axs = filterFlat(nodes, isValSignalAccessor);

   if (attrs.direction) {
      switch(attrs.direction) {
	 case "in": 
	 case "IN": dir = ast.IN; break;
	    
	 case "out": 
	 case "OUT": dir = ast.OUT; break;
	    
	 case "inout": 
	 case "INOUT": dir = ast.INOUT; break;
	    
	 default: throw SyntaxError("SIGNAL: illegal direction `"
				     + attrs.direction + "'", loc);
      }
   }
   
   checkNoChildren("SIGNAL", attrs, nodes, loc);
   if (!("name" in attrs)) {
      throw SyntaxError("SIGNAL: name missing", loc);
   }

   return new ast.SignalProperties(attrs.id, loc, attrs.name, dir,
				    attrs.init_func, // init_func
				    axs, // init_accessor_list
				    attrs.reinit_func, // reinit_func
				    [], // reinit_accessor_list
				    attrs.combine_func, // combine
				    undefined); // alias
}
   
/*---------------------------------------------------------------------*/
/*    EMIT ...                                                         */
/*---------------------------------------------------------------------*/
function EMIT(attrs={}, ...nodes) {
   const tag = attrs["%tag"] || "EMIT";
   const loc = attrsLoc(attrs, tag);
   const axs = filterFlat(nodes, isValSignalAccessor);
   const cntaxs = filterFlat(nodes, isCntSignalAccessor);
   const args = getEmitNodeArguments(tag, attrs, axs, cntaxs);
   
   checkNoChildren(tag, attrs, nodes, loc);

   if (args.signame_list.length === 0) {
      throw error.SyntaxError(tag + ": signal name missing", loc); 
   }
   
   return new ast.Emit(tag, args.id, loc,
			args.nodebug, args.signame_list,
			args.func,
			args.accessor_list,
			args.if_func,
			args.if_accessor_list);
}

/*---------------------------------------------------------------------*/
/*    SUSTAIN ...                                                      */
/*---------------------------------------------------------------------*/
function SUSTAIN(attrs={}, ...nodes) {
   const tag = attrs["%tag"] || "SUSTAIN";
   const loc = attrsLoc(attrs, tag);
   let axs = filterFlat(nodes, isValSignalAccessor);
   let cntaxs = filterFlat(nodes, isCntSignalAccessor);
   const args = getEmitNodeArguments(tag, attrs, axs, cntaxs);

   checkNoChildren(tag, attrs, nodes, loc);

   return new ast.Sustain(tag, args.id, loc, args.nodebug,
			   args.signame_list, args.func,
			   args.accessor_list, args.if_func,
			   args.if_accessor_list);
}

/*---------------------------------------------------------------------*/
/*    IF ...                                                           */
/*---------------------------------------------------------------------*/
function IF (attrs={}, ...nodes) {
   let axs = filterFlat(nodes, isValSignalAccessor);
   const tag = attrs["%tag"] || "IF";
   const loc = attrsLoc(attrs, tag);
   const args = getArgumentsExpressionNode(tag, attrs, loc, axs);
   const children = checkChildren(tag, attrs, nodes, 1, 2, loc);

   return new ast.If(tag, args.id, loc, args.nodebug,
		     [children[0], children[1]],
   		     args.not, args.func, args.accessor_list);
}

/*---------------------------------------------------------------------*/
/*    NOTHING ...                                                      */
/*---------------------------------------------------------------------*/
function NOTHING(attrs={}, ...nodes) {
   const tag = attrs["%tag"] || "NOTHING";
   const loc = attrsLoc(attrs, tag);
   checkNoChildren(tag, attrs, nodes, loc);
   
   return new ast.Nothing(tag, attrs.id, loc, has_nodebug_kwd(attrs));
}

/*---------------------------------------------------------------------*/
/*    PAUSE ...                                                        */
/*---------------------------------------------------------------------*/
function PAUSE(attrs={}, ...nodes) {
   const tag = attrs["%tag"] || "PAUSE";
   const loc = attrsLoc(attrs, tag);
   checkNoChildren(tag, attrs, nodes, loc);
   
   return new ast.Pause(tag, attrs.id, loc, has_nodebug_kwd(attrs));
}

/*---------------------------------------------------------------------*/
/*    HALT ...                                                         */
/*---------------------------------------------------------------------*/
function HALT(attrs={}, ...nodes) {
   const tag = attrs["%tag"] || "HALT";
   const loc = attrsLoc(attrs, tag);
   checkNoChildren(tag, attrs, nodes, loc);
   
   return new ast.Halt(tag, attrs.id, loc, has_nodebug_kwd(attrs));
}

/*---------------------------------------------------------------------*/
/*    AWAIT ...                                                        */
/*---------------------------------------------------------------------*/
function AWAIT(attrs={}, ...nodes) {
   const tag = attrs["%tag"] || "AWAIT";
   const loc = attrsLoc(attrs, tag);
   const axs = filterFlat(nodes, isValSignalAccessor);
   const cntaxs = filterFlat(nodes, isCntSignalAccessor);
   const args = getArgumentsCountExpressionNode(tag, attrs, axs, cntaxs);
   
   checkNoChildren(tag, attrs, nodes, loc);
   checkArgumentsAccessors(tag, args, args.loc);

   return new ast.Await(tag, args.id, args.loc, args.nodebug, args.func,
			 args.accessor_list, args.immediate,
			 args.func_count,
			 args.accessor_list_count);
}

/*---------------------------------------------------------------------*/
/*    SIGACCESS ...                                                    */
/*---------------------------------------------------------------------*/
function SIGACCESS(attrs={}, ...nodes) {
   const loc = attrsLoc(attrs, "SIGACCESS");
   checkNoChildren("SIGACCESS", attrs, nodes, loc);

   return new ast.SignalAccessor(attrs.signame, attrs.pre, attrs.val, attrs.cnt);
}
   
/*---------------------------------------------------------------------*/
/*    FORK ...                                                         */
/*---------------------------------------------------------------------*/
function FORK(attrs={}, ...nodes) {
   const tag = attrs["%tag"] || "FORK";
   const loc = attrsLoc(attrs, tag);
   const children = checkChildrenMin(tag, attrs, nodes, -1, loc);

   return new ast.Fork(tag, attrs.id, loc, has_nodebug_kwd(attrs), children);
}

/*---------------------------------------------------------------------*/
/*    ABORT ...                                                        */
/*---------------------------------------------------------------------*/
function ABORT(attrs={}, ...nodes) {
   const tag = attrs["%tag"] || "ABORT";
   const loc = attrsLoc(attrs, tag);
   const children = checkChildrenMin(tag, attrs, nodes, 1, loc);
   const axs = filterFlat(nodes, isValSignalAccessor);
   const cntaxs = filterFlat(nodes, isCntSignalAccessor);
   const args = getArgumentsCountExpressionNode(tag, attrs, axs, cntaxs);

   checkArgumentsAccessors(tag, args, loc);
   
   return new ast.Abort(tag, attrs.id, loc, args.nodebug, args.func,
      args.accessor_list, args.immediate,
      args.func_count,
      args.accessor_list_count,
      makeImplicitSequence(attrs, children));
}

/*---------------------------------------------------------------------*/
/*    WEAKABORT ...                                                    */
/*---------------------------------------------------------------------*/
function WEAKABORT(attrs={}, ...nodes) {
   const tag = attrs["%tag"] || "WEAKABORT";
   const loc = attrsLoc(attrs, tag);
   const children = checkChildrenMin(tag, attrs, nodes, 1, loc);
   const axs = filterFlat(nodes, isValSignalAccessor);
   const cntaxs = filterFlat(nodes, isCntSignalAccessor);
   const args = getArgumentsCountExpressionNode(tag, attrs, axs, cntaxs);
   
   checkArgumentsAccessors(tag, args, loc);
   return new ast.WeakAbort(tag, attrs.id, loc, args.nodebug,
   			     args.func, args.accessor_list,
			     args.immediate,
   			     args.func_count,
			     args.accessor_list_count,
   			     makeImplicitSequence(attrs, children));
}

/*---------------------------------------------------------------------*/
/*    SUSPEND_ ...                                                     */
/*---------------------------------------------------------------------*/
function SUSPEND_(attrs={}, ...nodes) {
   const tag = attrs["%tag"] || "SUSPEND";
   const loc = attrsLoc(attrs, tag);
   let axs = filterFlat(nodes, isValSignalAccessor);
   const args = getArgumentsExpressionNode(tag, attrs, loc, axs);
   const children = checkChildrenMin(tag, attrs, nodes, 1, loc);

   return new ast.Suspend(tag, args.id, loc, args.nodebug,
			   makeImplicitSequence(attrs, children),
			   args.func, args.accessor_list, 
			   args.immediate);
}

/*---------------------------------------------------------------------*/
/*    SUSPEND ...                                                      */
/*---------------------------------------------------------------------*/
function SUSPEND(attrs={}, ...nodes) {
   const tag = attrs["%tag"] || "SUSPEND";
   let loc = attrsLoc(attrs, tag);
   let sig_list = getSignalNameList(tag, attrs, loc);
   let signame = sig_list[0];
   let axs = filterFlat(nodes, isValSignalAccessor);
   
   delete attrs[signame];
   for(let key in attrs) {
      attrs[key.toLowerCase()] = attrs[key];
   }

   let condFrom = attrs.from
       || attrs.fromapply
       || attrs.fromvalue;
   let condToggle = attrs.togglesignal
       || attrs.toggleapply
       || attrs.togglevalue;
   let condRegular = attrs.apply
       || attrs["%value"];

   if (sig_list.length == 0 && !condFrom && !condRegular && !condToggle) {
      throw error.SyntaxError("SUSPEND: missing suspend condition.", loc);
   } else if ((condFrom && condToggle)
	      || (condFrom && condRegular)
	      || (condToggle && condRegular)) {
      throw error.SyntaxError("SUSPEND: cannot use suspend-from/-toggle/apply/%value"
			     + " together",
			     loc);
   } else if (condFrom && signame) {
      throw error.SyntaxError("SUSPEND: cannot use suspend-from with a signal.",
			     loc);
   } else if (condToggle && signame) {
      throw error.SyntaxError("SUSPEND: cannot use suspend-toggle with a signal.",
			     loc);
   } else if (condRegular && signame) {
      throw error.SyntaxError("SUSPEND: cannot use suspend with apply/%value and a signal.",
			     loc);
   } else if (sig_list.length > 1) {
      throw error.SyntaxError("SUSPEND: cannot have more than 1 signal.",
			     loc);
   }

   if (("from" in attrs || "fromapply" in attrs || "fromvalue" in attrs) &&
       ("to" in attrs || "toapply" in attrs || "tovalue" in attrs)) {
      // Handle the suspend-from-to
      return LOCAL({ SUSPEND_CONTINUOUS: "", nodebug: "", "%location": loc },
	 TRAP({ END_BODY: "", nodebug: "", "%location": loc },
	    FORK({ nodebug: "", "%location": loc },
	       SEQUENCE({ nodebug: "", "%location": loc},
		  SUSPEND_({immediate: "", "%location": loc, SUSPEND_CONTINUOUS: "" },
		     SEQUENCE.apply(this, [{"%location": loc}].concat(nodes))),
		  EXIT({END_BODY: "", "%location": loc, nodebug: "" })),
	       EVERY({ signal: attrs.from,
	               immediate: attrs.immediate,
	               apply: attrs.fromapply,
	               applyAccessors: attrs.fromAccessors,
	               "%value": attrs.fromvalue,
		       "%location": loc,
	               nodebug: "" },
		  nodes[0] instanceof Array ?
	       	     filterFlat(nodes[0], isValSignalAccessor) 
		     : NOTHING({ "%location": loc }),
		  ABORT({ signal: attrs.to,
			  apply: attrs.toapply,
			  applyAccessors: attrs.toAccessors,
			  "%value": attrs.tovalue,
		       	  "%location": loc,
 			  nodebug: "" },
		     nodes[1] instanceof Array ?
	       	     	filterFlat(nodes[1], isValSignalAccessor) 
			: NOTHING({ "%location": loc }),
		     FORK({ "%location": loc, nodebug: "" },
			SUSTAIN({ SUSPEND_CONTINUOUS: "", 
		       	  	  "%location": loc,
				  nodebug: "" }),
			attrs.emitwhensuspended
			   ? SUSTAIN({ [attrs.emitwhensuspended]: "",
		       	  	       "%location": loc,
				       nodebug: "" })
			   : NOTHING({ "%location": loc })))))));
   } else if ("togglesignal" in attrs 
      || "togglevalue" in attrs 
      || "toggleapply" in attrs) {
      return LOCAL({ SUSPEND_CONTINUOUS: "", nodebug: "", "%location": loc },
	 TRAP({ END_BODY: "", nodebug: "", "%location": loc },
	    FORK({ nodebug: "", "%location": loc },
	       SEQUENCE({ nodebug: "", "%location": loc },
		  SUSPEND_({immediate: "",
			    "%location": loc,
			    SUSPEND_CONTINUOUS: "" },
		     SEQUENCE.apply(this, [{"%location": loc}].concat(nodes))),
			EXIT({END_BODY: "", nodebug: "", "%location": loc })),
		 LOOP({"%location": loc},
		  AWAIT({ immediate: attrs.immediate,
			  signal: attrs.togglesignal,
			  apply:  attrs.toggleapply,
			  applyAccessors: attrs.toggleAccessors,
			  "%value": attrs.togglevalue,
			  "%location": loc,
 			  nodebug: "" },
		     axs),
		  ABORT({ signal: attrs.togglesignal,
			  apply: attrs.toggleapply,
			  applyAccessors: attrs.toggleAccessors,
			  "%value": attrs.togglevalue,
			  "%location": loc,
 			  nodebug: "" },
		     axs,
                     FORK({ nodebug: "", "%location": loc },
			SUSTAIN({ SUSPEND_CONTINUOUS: "", 
			  	  "%location": loc,
				  nodebug: ""}),
			attrs.emitwhensuspended
			   ? SUSTAIN({ [attrs.emitwhensuspended]: "",
			  	       "%location": loc,
				       nodebug: ""})
			: NOTHING({ "%location": loc }))),
		    PAUSE({ "%location": loc })))));
   } else {
      if (axs.length == 0) attrs[signame] = "";
      const args = getArgumentsExpressionNode(tag, attrs, loc, axs);
      const children = checkChildrenMin(tag, attrs, nodes, 1, loc);
      checkArgumentsAccessors(tag, args, loc);

      return new ast.Suspend(tag, args.id, loc, args.nodebug,
			      makeImplicitSequence(attrs, children),
			      args.func, args.accessor_list,
			      args.immediate);
   }
}

/*---------------------------------------------------------------------*/
/*    LOOP ...                                                         */
/*---------------------------------------------------------------------*/
function LOOP(attrs={}, ...nodes) {
   const tag = attrs["%tag"] || "LOOP";
   const loc = attrsLoc(attrs, "LOOP");
   const children = checkChildrenMin("LOOP", attrs, nodes, 1, loc);

   return new ast.Loop(tag, attrs.id,
		       loc, has_nodebug_kwd(attrs),
		       makeImplicitSequence(attrs, children));
}

/*---------------------------------------------------------------------*/
/*    LOOPEACH ...                                                     */
/*---------------------------------------------------------------------*/
function LOOPEACH(attrs={}, ...nodes) {
   const tag = attrs["%tag"] || "LOOPEACH";
   const loc = attrsLoc(attrs, tag);
   let axs = filterFlat(nodes, isValSignalAccessor);
   let cntaxs = filterFlat(nodes, isCntSignalAccessor);
   const args = getArgumentsCountExpressionNode(tag, attrs, axs, cntaxs);
   const children = checkChildrenMin(tag, attrs, nodes, 1, loc);
   
   checkArgumentsAccessors(tag, args, args.loc);

   return new ast.LoopEach(tag, args.id, args.loc, args.nodebug,
			    makeImplicitSequence(attrs, children),
			    args.func, args.accessor_list,
			    args.func_count,
			    args.accessor_list_count);
}

/*---------------------------------------------------------------------*/
/*    EVERY ...                                                        */
/*---------------------------------------------------------------------*/
function EVERY(attrs={}, ...nodes) {
   const tag = attrs["%tag"] || "EVERY";
   const loc = attrsLoc(attrs, tag);
   let axs = filterFlat(nodes, isValSignalAccessor);
   let cntaxs = filterFlat(nodes, isCntSignalAccessor);
   const args = getArgumentsCountExpressionNode(tag, attrs, axs, cntaxs);
   
   const children = checkChildrenMin(tag, attrs, nodes, 1, loc);
   checkArgumentsAccessors(tag, args, args.loc);

   return new ast.Every(tag, args.id, args.loc, args.nodebug,
			 makeImplicitSequence(attrs, children),
			 args.func, args.accessor_list,
			 args.immediate,
			 args.func_count,
			 args.accessor_list_count);
}

/*---------------------------------------------------------------------*/
/*    SEQUENCE ...                                                     */
/*---------------------------------------------------------------------*/
function SEQUENCE(attrs={}, ...nodes) {
   const tag = attrs["%tag"] || "SEQUENCE";
   const loc = attrsLoc(attrs, tag);
   const children = checkChildrenMin("SEQUENCE", attrs, nodes, -1, loc);

   return new ast.Sequence(tag, attrs.id, loc, 
			    has_nodebug_kwd(attrs),
			    children);
}

/*---------------------------------------------------------------------*/
/*    ATOM ...                                                         */
/*---------------------------------------------------------------------*/
function ATOM(attrs={}, ...nodes) {
   let axs = filterFlat(nodes, isValSignalAccessor);
   const tag = attrs["%tag"] || "ATOM";
   const loc = attrsLoc(attrs, tag);
   const args = getArgumentsActionNode(tag, attrs, !axs.length);
   checkNoChildren(tag, attrs, nodes, loc);

   return new ast.Atom(tag, args.id, args.loc, args.nodebug, args.func, 
      tag === "frame" ? [] : undefined,
      mergeAccessors(axs, args.accessor_list));
}

/*---------------------------------------------------------------------*/
/*    TRAP ...                                                         */
/*---------------------------------------------------------------------*/
function TRAP(attrs={}, ...nodes) {
   const tag = attrs["%tag"] || "TRAP";
   const loc = attrsLoc(attrs, tag);
   const children = checkChildrenMin(tag, attrs, nodes, 1, loc);
   
   return new ast.Trap(tag, attrs.id, loc, 
			has_nodebug_kwd(attrs),
			getTrapName(tag, attrs),
			makeImplicitSequence(attrs, children));
}

/*---------------------------------------------------------------------*/
/*    EXIT ...                                                         */
/*---------------------------------------------------------------------*/
function EXIT(attrs={}, ...nodes) {
   const tag = attrs["%tag"] || "EXIT";
   const loc = attrsLoc(attrs, tag);
   checkNoChildren(tag, attrs, nodes, loc);
   
   return new ast.Exit(tag, attrs.id, loc,
			has_nodebug_kwd(attrs),
			getTrapName(tag, attrs));
}

/*---------------------------------------------------------------------*/
/*    RUN ...                                                          */
/*---------------------------------------------------------------------*/
function RUN(attrs={}, ...nodes) {
   const tag = attrs["%tag"] || "RUN";
   let loc = attrsLoc(attrs, tag);

   if (!attrs.module || !(attrs.module instanceof ast.Module)) {
      throw error.TypeError(tag + ": module expected", loc);
   }

   checkNoChildren(tag, attrs, nodes, loc);

   let module = attrs.module.clone();
   let sigdecllist = module.sigDeclList;

   sigdecllist.forEach((sigdecl, d, a) => {
      let sigalias = attrs[sigdecl.name] ??
	 (attrs.aliases ? attrs.aliases[sigdecl.name] : false);

      if (sigalias) {
	 if (typeof(sigalias) !== "string") {
	    throw error.SyntaxError(tag + ": illegal " +
				     sigdecl.name + " aliasing.",
				     loc);
	 } else {
	    sigdecl.alias = sigalias;
	 }
      } else if (sigalias === "") {
	 sigdecl.alias = sigdecl.name;
      } else if (attrs.autocomplete || (attrs.aliases ? attrs.aliases["*"] : false)) {
	 sigdecl.alias = sigdecl.name;
      } else if (attrs.autocompletestrict || (attrs.aliases ? attrs.aliases["+"] : false)) {
	 sigdecl.alias = sigdecl.name;
      } else {
	 sigdecl.alias = false;
      }
   });

   const decllist = sigdecllist.filter(s => !s.alias);
   const frameNode = ast.findFrameNode(module.children);

   if (frameNode) frameNode.frame = attrs["%frame"];
   
   let body = new ast.Local(tag, attrs.id, loc, false, decllist,
      makeImplicitSequence(attrs, module.children));
   body.in_run_context = true;

   return new ast.Run(tag, attrs.id, loc, module.name, 
		       has_nodebug_kwd(attrs), sigdecllist, 
		       attrs.autocomplete, attrs.autocompletestrict, attrs["%frame"], body);
}

/*---------------------------------------------------------------------*/
/*    EXEC ...                                                         */
/*---------------------------------------------------------------------*/
function EXEC(attrs={}, ...nodes) {
   const tag = attrs["%tag"] || "EXEC";
   let loc = attrsLoc(attrs, tag);
   let axs = filterFlat(nodes, isValSignalAccessor);
   let args = getEmitNodeArguments(tag, attrs, axs, [], true);

   checkNoChildren(tag, attrs, nodes, loc);
   if (attrs["%value"]) {
      throw error.SyntaxError(tag + ": must takes an apply argument.", loc);
   }

   if (attrs.resApply && !(attrs.resApply instanceof Function)) {
      throw error.TypeError("Function", typeof attrs.resApply, loc);
   }

   if (attrs.suspApply && !(attrs.suspApply instanceof Function)) {
      throw error.TypeError("Function", typeof attrs.suspApply, loc);
   }

   if (attrs.killApply && !(attrs.killApply instanceof Function)) {
      throw error.TypeError("Function", typeof attrs.killApply, loc);
   }

   return new ast.Exec(tag, args.id, loc, args.nodebug,
			args.signame_list[0], args.func,
			mergeAccessors(axs, args.accessor_list),
			attrs.resApply, attrs.suspApply, attrs.killApply);
}
