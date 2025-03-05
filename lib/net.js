/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/net.js                    */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal, Manuel Serrano, Gerard Berry         */      
/*    Creation    :  Sun Sep  9 06:19:12 2018                          */
/*    Last change :  Wed Mar  5 12:13:13 2025 (serrano)                */
/*    Copyright   :  2018-25 Inria                                     */
/*    -------------------------------------------------------------    */
/*    HipHop net construction and propagation                          */
/*=====================================================================*/
"use strict";
"use hopscript";

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
import * as error from "./error.js";
import * as signal from "./signal.js";
import * as ast from "./ast.js";

export { DEBUG_PROPAGATE, DEBUG_ACTION }
export { resetNetId };
export { FAN };
export { Net, WireNet, RegisterNet, LogicalNet, SignalNet, ActionNet };
export { TestExpressionNet, SignalExpressionNet };
export { makeSig, makeOr, makeAnd };

/*---------------------------------------------------------------------*/
/*    DEBUG                                                            */
/*---------------------------------------------------------------------*/
const DEBUG_PROPAGATE = process.env.HIPHOP_TRACE
   && process.env.HIPHOP_TRACE.split(",").find(n => n === "propagate");
const DEBUG_ACTION = process.env.HIPHOP_TRACE
   && process.env.HIPHOP_TRACE.split(",").find(n => n === "action");

/*---------------------------------------------------------------------*/
/*    fanin/fanout connections                                         */
/*---------------------------------------------------------------------*/
const FAN = { STD: 1, NEG: 2, DEP: 3 };

/*---------------------------------------------------------------------*/
/*    globalId; ...                                                    */
/*---------------------------------------------------------------------*/
let globalId = 0;

/*---------------------------------------------------------------------*/
/*    resetNetId ...                                                   */
/*---------------------------------------------------------------------*/
function resetNetId(cnt = 0) {
   globalId = cnt;
}

/*---------------------------------------------------------------------*/
/*    Net ...                                                          */
/*    -------------------------------------------------------------    */
/*    Net Root class hierarchy.                                        */
/*---------------------------------------------------------------------*/
// @sealed
class Net {
   id;
   astNode;
   faninList;
   fanoutList;
   lvl;
   trueFaninCount;
   dependencyCount;
   value;
   isInKnownList;
   valid;
   sweepable = true;
   sweeped = false;
   dfn;
   head;
   #dependencyCount;
   #trueFaninCount;
   #len;
   #debugTrace;
   
   constructor(astNode, debugName, lvl) {
      if (astNode.machine.verbose > 0 && typeof debugName !== "string")
	 throw new Error(`bad "debugName" (${typeof debugName}) for Net ${this.constructor.name} from ast node ${astNode.ctor}`);
      if (typeof lvl !== "number")
	 throw new Error(`bad "lvl" (${typeof lvl}) for Net ${this.constructor.name} from ast node ${astNode.ctor}`);

      // MS 28feb2025, why do we need both?
      astNode.machine.nets.push(this);
      astNode.net_list.push(this);

      this.debugName = `${debugName} [${astNode.ctor}:${lvl}/${astNode.depth}]`;
      this.id = globalId++;
      this.astNode = astNode;
      this.faninList = [];
      this.fanoutList = [];
      this.lvl = lvl;
      this.trueFaninCount = 0;
      this.dependencyCount = 0;
      this.value = undefined;
      this.isInKnownList = false;
      this.valid = true; // see invalidate below
      this.#dependencyCount = 0;
      this.#trueFaninCount = 0;
      this.#len = 0;
   }

   // GB for net dumping
   LogicalNetType() {
      return "";
   }

   setDebugTrace(trace = false) {
      if (trace) {
	 this.#debugTrace = trace;
      } else {
	 this.sweepable = false;
	 this.#debugTrace = function() {
	    return(`${this.id} ${this.debugName}@${this.astNode.loc.pos} <= ${this.value}`);
	 }
      }
   }

   getDebugTrace() {
      return this.#debugTrace;
   }
      
   dump() {
      // GB : added net fanin polarity in the dump
      return {
	 id: this.id,
	 lvl: this.lvl,
	 type: this.LogicalNetType(),
	 fanout: this.fanoutList
	    .map(fan => { return { id: fan.net.id, polarity: fan.polarity, dep: fan.dependency }}),
	 fanin: this.faninList
	    .map(fan => { return { id: fan.net.id, polarity: fan.polarity, dep: fan.dependency }}),
	 $name: this.debugName,
	 $ast: this.astNode.ctor,
	 $sweepable: this.sweepable,
	 $loc: this.astNode.loc,
      }
   }

   reset(reset_machine) {
      this.isInKnownList = false;

      const faninList = this.faninList;
      const len = faninList.length;
      
      if (len !== this.#len) {
	 this.#dependencyCount = 0;
	 this.#trueFaninCount = 0;
	 this.#len = len;
	 
      	 for (let i = 0; i < len; i++) {
	    const fanin = faninList[i];
	    if (fanin.dependency) {
	       this.#dependencyCount++;
	    } else {
	       this.#trueFaninCount++;
	    }
      	 }
      }

      this.dependencyCount = this.#dependencyCount;
      this.trueFaninCount = this.#trueFaninCount;
   }

   invalidate() {
      // a net is invalidate when its owner AST node is removed from
      // the program (see ast.removeChild)
      this.valid = false;
   }

   trace(age) {
      // debug see compiler.js
      if (this.#debugTrace) {
	 console.error(`[${age}] ${this.#debugTrace()}`);
      }
      return this;
   }
      
   propagate(knownList, age) {
      const trace = this.astNode.machine.tracePropagation || DEBUG_PROPAGATE;
      
      if (trace) {
	 console.error(`[${age}] propagate ${this.id} v=${this.value} [${this.debugName}/${this.constructor.name}])`);
      }

      this.fanoutList.forEach(fanout => {
         let propagatedValue = (fanout.polarity ? this.value : !this.value);
	 
	 if (trace) fanout.net.receiveTraceEnter(fanout.dependency);
	 
	 if (fanout.net.receive(propagatedValue, fanout.dependency)) {
	    fanout.net.isInKnownList = true;
	    knownList.push(fanout.net);

	    fanout.net.trace(age);
	 }
	 
	 if (trace) fanout.net.receiveTraceExit();
      });
   }

   receiveTraceEnter() {
   }

   receiveTraceExit() {
   }
   
   receiveNoValue() {
      if (this.isInKnownList) {
	 // already handled, return immediately,
	 // nothing to be done by the caller.
	 return false;
      }
      
      // only used from a disconnected wire net
      this.trueFaninCount--;

      if (this.trueFaninCount === 0) {
	 this.value = false;
	 return true;
      } else {
	 return false;
      }
   }
   
   receive(_1, _2) {
      throw new error.InternalError(`not implemented ${this.constructor.name}`);
   }

   connectTo(net, connType) {
      function makeFan(net, connType) {
	 return { 
	    net: net,
	    polarity: connType !== FAN.NEG,
	    dependency: connType === FAN.DEP,
	    antagonist: null
	 }
      }

      if (connType === undefined || connType < FAN.STD || connType > FAN.DEP) {
	 throw new error.TypeError("illegal fan", this.astNode.loc);
      }

      if (!net) {
	 throw new error.TypeError(`${this.debugName}: undefined net`,
  				    this.astNode.loc);
      }

      if (net instanceof RegisterNet) {
	 if (net.faninList.length === 1) {
	    throw new error.TypeError("too many fanin for register",
				       net.astNode.loc);
	 }
	 if (connType === FAN.DEP) {
	    throw new error.TypeError("illegal dependency",
				       net.astNode.loc);
	 }
      }

      let fanout = makeFan(net, connType);
      let fanin = makeFan(this, connType);
      fanout.antagonist = fanin;
      fanin.antagonist = fanout;
      
      this.fanoutList.push(fanout);
      net.faninList.push(fanin);
      
      if (net instanceof WireNet) {
	 if (net.faninList.length >= 2) {
	    throw new error.TypeError(`Wire "${net.id} ${net.debugName}" with more than one fanin [${net.faninList.map(f => f.net.id + ":" + f.net.debugName).join(", ")}]`,
				      net.astNode.loc);
	 }
      }
   }

   toJSVar() {
      if (this.sweeped) {
	 return "undefined";
      } else {
	 return "_" + this.id;
      }
   }

   toJSDecl() {
      return this.toJSVar();
   }

   toJSAction() {
      return false;
   }
   
   toJS() {
      return `/* not implemented ${this.constructor.name} */`;
   }
}

/*---------------------------------------------------------------------*/
/*    WireNet ...                                                      */
/*    -------------------------------------------------------------    */
/*    This nets are only used during the compilation. They are         */
/*    used to implement the circuits interface and they must be        */
/*    elimnated after the compilation completes.                       */
/*---------------------------------------------------------------------*/
// @sealed
class WireNet extends Net {
   constructor(astNode, debugName, lvl) {
      super(astNode, debugName, lvl);
      this.lvl = lvl;
      this.neutral = false;
   }
   
   LogicalNetType () {
      return "WIRE";
   }

   receive(value, _) {
      this.value = value;
      return true;
   }
   
   receiveTraceEnter() {
      console.error(`   *> ${this.id} value:${this.value} (${this.debugName})`);
   }
   
   receiveTraceExit() {
      console.error(`   *< ${this.id} value:${this.value} (${this.debugName})`);
   }
}

/*---------------------------------------------------------------------*/
/*    RegisterNet ...                                                  */
/*---------------------------------------------------------------------*/
// @sealed
class RegisterNet extends Net {
   dynamic;
   stable_id;
   
   constructor(astNode, debugName, lvl) {
      super(astNode, debugName, lvl);

      this.stable_id = astNode.instr_seq + "_" + astNode.next_register_id++;

      // If true, this register must be true after the first machine
      // reinitialization (that follow a compilation)
      this.dynamic = false;
      this.sweepable = false;
   }

   LogicalNetType() {
      return "REG";
   }

   dump() {
      const d = super.dump();

      if (this.astNode.machine.verbose > 0) {
	 return Object.assign(d, {
	    value: this.value
	 });
      } else {
	 return d;
      }
   }
      
   reset(reset_machine) {
      super.reset(reset_machine);

      if (this.dynamic) {
	 this.value = true;
	 this.dynamic = false;
	 return;
      }

      if (reset_machine) {
	 this.value = false;
      }
   }

   receiveTraceEnter() {
      console.error(`   => ${this.id} value:${this.value} (${this.debugName})`);
   }
   
   receive(value, _) {
      this.trueFaninCount--;

      if (this.trueFaninCount < 0) {
	 throw new error.TypeError("Out of range Register.trueFaninCount",
				    this.astNode.loc);
      }
      this.value = value;
      return false;
   }

   toJSReg() {
     return "R" + this.id;
   }

   toJSDecl() {
      return `${this.toJSVar()} = ${this.toJSReg()}`;
   }
   
   toJS() {
      const f = this.faninList[0];
      return `${this.toJSReg()} = ${f.polarity === false ? "!" : ""}${f.net.toJSVar()}`;
   }
}

/*---------------------------------------------------------------------*/
/*    LogicalNet                                                       */
/*---------------------------------------------------------------------*/
// @sealed
class LogicalNet extends Net {
   neutral;
   
   constructor(astNode, debugName, lvl, neutral) {
      super(astNode, debugName, lvl);

      if (neutral != undefined && neutral != true && neutral != false) {
	 throw new error.TypeError("`neutral` must be a boolean",
				   this.astNode.loc);
      }
      this.neutral = neutral;
   }

   LogicalNetType () {
      if (this.neutral === true) {
         return this.faninList.length === 0 ? "TRUE" : "AND";
      } else {
         return this.faninList.length === 0 ? "FALSE" : "OR";
      }
   }

   reset(reset_machine) {
      super.reset(reset_machine);

      if (this.faninList.length === 0) {
	 this.value = this.neutral;
      } else {
	 this.value = undefined;
      }
   }

   receiveTraceEnter(fromDep) {
      console.error("   "
	 + (fromDep ? "~> " : "-> ")
	 + this.id + " "
	 + (this.dependencyCount + "+" + this.trueFaninCount)
	 + " this.v=" + this.value + " this.n=" + this.neutral
	 + " " + "(" + this.constructor.name + ")");
   }

   receiveTraceExit() {
      console.error((this.isInKnownList ? "   !< " : "    < ") + this.id + " "
	 + (this.dependencyCount + "+" + this.trueFaninCount)
	 + " this.v=" + this.value
	 + " " + "(" + this.constructor.name + ")");
   }

   receiveValue(value) {
      // true fanin
      this.trueFaninCount--;
      
      if (value !== this.neutral) {
	 // value received is not-neutral, immediately becomes the net's
	 // value, always return true because dependencies are not
	 // relevant anymore
	 this.value = value;
	 return true;
      } else {
	 // neutral value received, value becomes neutral if no more
	 // true fanin, but then return true only if there are
	 // no more dependencies
	 if (this.trueFaninCount === 0) {
	    this.value = this.neutral;
	    return true;
	 } else {
	    // wait for more inputs
	    return false;
	 }
      }
   }
      
   receive(value, fromDep) {
      if (this.isInKnownList) {
	 // already handled, return immediately,
	 // nothing to be done by the caller.
	 return false;
      }

      this.checkNet(undefined);
      
      if (fromDep) {
	 if (--this.dependencyCount) {
	    return false;
	 } else {
	    if (this.trueFaninCount === 0) {
	       this.value = this.neutral;
	       return true;
	    } else {
	       return false;
	    }
	 }
      } else {
	 return this.receiveValue(value);
      }
   }

   checkNet(nvalue) {
      if (this.dependencyCount < 0 || this.trueFaninCount < 0) {
	 throw new error.TypeError("Out of range fanin/dependency count." +
				    " [" + this.trueFaninCount + " " +
				    this.dependencyCount + " " +
				    this.faninList.length + "]",
				    this.astNode.loc);
      }
      if (this.neutral !== nvalue && nvalue !== undefined) {
	 throw new Error.TypeError(`Bad net neutral value ${this.id}`);
      }
   }

   toJS() {
      if (this.faninList.length === 0) {
	 return `${this.toJSVar()} = ${this.neutral.toString()}`;
      } else {
	 const deps = this.faninList
	    .filter(f => !f.dependency)
	    .map(f => (f.polarity === false ? "!" : "") + f.net.toJSVar());
	 if (deps.length === 0) {
	    return `${this.toJSVar()} = undefined`;
	 } else {
	    return `${this.toJSVar()} = ${deps.join(this.neutral ? " && " : " || ")}`;
	 }
      }
   }
}

/*---------------------------------------------------------------------*/
/*    SignalNet                                                        */
/*---------------------------------------------------------------------*/
// @sealed
class SignalNet extends LogicalNet {
   accessibility = 0;
   signal;
   signame;
   
   constructor(astNode, signal, signame, accessibility, lvl, neutral) {
      super(astNode, signame, lvl, neutral);
      this.sweepable = !(accessibility & ast.OUT);
      this.accessibility = accessibility;
      this.signal = signal;
      this.signame = signame;
   }
   
   LogicalNetType () {
      return "SIG";
   }

   dump() {
      const d = super.dump();
      d.signame = this.signame;
      d.accessibility = this.accessibility;
      return d;
   }
   
   toJSDecl() {
      if (this.accessibility & ast.IN) {
	 return `${this.toJSVar()} = ("${this.signal.name}" in signals)`;
      } else if (this.faninList.length === 0) {
	 return `${this.toJSVar()} = false`;	    
      } else {
	 return super.toJSDecl();
      }
   }

   toJS() {
      if (this.faninList.length === 0) {
	 return `// ${super.toJS()}`;
      } else {
	 return `if (!${this.toJSVar()}) ${super.toJS()}`;
      }
   }
}

/*---------------------------------------------------------------------*/
/*    ActionNet ...                                                    */
/*---------------------------------------------------------------------*/
// @sealed
class ActionNet extends LogicalNet {
   func;
   accessor_list;
   actionArgs;
   evaluated = false;

   constructor(astNode, debugName, lvl, func, accessor_list) {
      super(astNode, debugName, lvl, true);

      this.func = func;
      this.accessor_list = accessor_list;
      this.actionArgs = new Array(lvl + 1).fill(false);
      signal.runtimeSignalAccessor(astNode, accessor_list, lvl, this);
      // pre-allocate the objects that will be passed as 
      // the "this" to user actions
      for (let i = 0; i <= lvl; i++) {
	 this.actionArgs[i] = new signal.ActionArg(accessor_list);
      }
   }

   LogicalNetType () {
      return (this.neutral ? "ACTION" : "ACTION-");
   }

   dump() {
      function pp(fun) {
	 const s = fun.toString()
	    .replace(/function *\(\) {/, "")
	    .replace(/return \(\(\(\) => {/, "")
	    .replace(/}\)\(\)\);/, "")
	    .replace(/}/, "")
	    .replace(/\n\n*/g," ")
	    .replace(/>/g, "&gt;")
	    .replace(/</g, "&lt;")
	    .trim()
	 return s;
      }

      const d = super.dump();

      if (this.astNode.machine.verbose > 0) {
	 return Object.assign(d, {
	    $signals: this.accessor_list.map(x => x.signame + "?").join(),
	    $action: this.func ? pp(this.func) : "undefined"
	 });
      } else {
	 return d;
      }
   }
   
   reset(reset_machine) {
      super.reset(reset_machine);
      this.evaluated = false;
   }
   
   receive(value, fromDep) {
      if (this.isInKnownList) {
	 // already handled, return immediately,
	 // nothing to be done by the caller.
	 return false;
      }

      this.checkNet(true);

      if (fromDep) {
	 if (--this.dependencyCount) {
	    return false;
	 } else if (this.trueFaninCount === 0) {
	    if (this.value == undefined) {
	       this.value = this.neutral;
	    }

	    if (this.value === true) {
	       this.action();
	    }
	    return true;
	 } else {
	    return false;
	 }
      } else if (this.receiveValue(value)) {
	 if (this.dependencyCount === 0) {
	    if (this.value === true && !this.evaluated) {
	       this.action();
	    }
	    return true;
	 } else if (this.value !== this.neutral) {
	    return true;
	 } else {
	    return false;
	 }
      } else {
	 return false;
      }
   }

   apply_func() {
      if (this.func) {
	 const functhis = this.actionArgs[this.lvl];
	 functhis.fill(this.accessor_list, this.lvl);

	 if (this.astNode.machine.tracePropagation || DEBUG_PROPAGATE || DEBUG_ACTION) {
	    console.error(`   exec ${this.id} ${this.debugName}`);
	 }

	 return this.func.call(functhis);
      } else {
	 // No function is provided to the ActionNet, hence, accessor
	 // list has only one element, to access to a signal
	 // (pre)presence.
	 let acc = this.accessor_list[0];

	 if (acc.get_pre) {
	    return acc.signal.pre_gate.value;
	 } else {
	    let sig = acc.signal;
	    let lvl = this.lvl;
	    let min_lvl = lvl > sig.astNode.depth ? sig.astNode.depth : lvl;

	    return sig.gate_list[min_lvl].value;
	 }
      }
   }

   action() {
      if (this.valid) {
	 this.evaluated = true;
	 this.apply_func();
      }
   }

   toJSAction() {
      return "A" + this.id;
   }
   
   toJSArg() {
      return "T" + this.id;
   }
   
   toJS() {
      const d = super.toJS();
      const l = this.lvl;
      const axs = this.accessor_list
	 .map(ax => `fillThisArg(${this.toJSArg()}[${l}], "${ax.signame}", ${ax.signal.id}, ${ax.signal.gate_list[0].toJSVar()}, ${ax.signal.pre_gate ? ax.signal.pre_gate.toJSVar() : undefined})`);
      return `${d}; if (${this.toJSVar()}) { ${axs.join("; ")}; ${this.toJSAction()}.call(${this.toJSArg()}[${l}]); }`
   }
}

/*---------------------------------------------------------------------*/
/*    TestExpressionNet ...                                            */
/*---------------------------------------------------------------------*/
// @sealed
class TestExpressionNet extends ActionNet {
   constructor(astNode, debugName, lvl, func, accessor_list) {
      super(astNode, debugName, lvl, func, accessor_list);
   }

   LogicalNetType () {
      return (this.neutral ? "TEST" : "TEST-");
   }

   receive(value, fromDep) {
      if (this.isInKnownList) {
	 // already handled, return immediately,
	 // nothing to be done by the caller.
	 return false;
      }

      this.checkNet(true);

      if (fromDep) {
	 if (--this.dependencyCount) {
	    return false;
	 } else {
	    const avalue = this.action();

	    if (avalue !== this.neutral) {
	       this.value = avalue;
	       return true;
	    } else if (this.trueFaninCount === 0) {
	       this.value = this.neutral;
	       return true;
	    } else {
	       // wait for more inputs
	       return false;
	    }
	 }
      } else if (this.receiveValue(value)) {
	 if (this.value !== this.neutral) {
	    return true;
	 } else if (this.dependencyCount === 0) {
	    if (!this.evaluated) {
	       this.value = this.action();
	    }
	    return true;
	 } else {
	    this.value = undefined;
	    return false;
	 }
      } else {
	 return false;
      }
   }

   action() {
      if (this.valid) {
	 const v = !!this.apply_func();
	 this.evaluated = true;
	 return v;
      }
   }
   
   toJS() {
      const d = super.toJS();
      const l = this.lvl;
      const axs = this.accessor_list
	 .map(ax => `fillThisArg(${this.toJSArg()}[${l}], "${ax.signame}", ${ax.signal.id}, ${ax.signal.gate_list[0].toJSVar()}, ${ax.signal.pre_gate ? ax.signal.pre_gate.toJSVar() : undefined})`);
      return `${d}; if (${this.toJSVar()}) { ${axs.join("; ")}; ${this.toJSVar()} = ${this.toJSAction()}.call(${this.toJSArg()}[${l}]); }`
   }
}

/*---------------------------------------------------------------------*/
/*    SignalExpressionNet ...                                          */
/*---------------------------------------------------------------------*/
// @sealed
class SignalExpressionNet extends ActionNet {
   signal_depth;
   min_lvl;
   signal;
   
   constructor(astNode, signal, debugName, lvl, func, accessor_list) {
      super(astNode, debugName, lvl, func, accessor_list);

      this.signal = signal;
      this.signal_depth = this.signal.depth;
      this.min_lvl = lvl > this.signal_depth ? this.signal_depth : lvl;
      this.connectTo(signal.dependency_gate_list[this.min_lvl], FAN.DEP);
   }

   LogicalNetType () {
      return (this.neutral ? "SIGACTION" : "SIGACTION-");
   }

   dump() {
      const d = super.dump();
      if (this.astNode.machine.verbose > 0) {
	 return Object.assign(d, {
	    signal: `!${this.signal.name}:${this.signal_depth}`
	 });
      } else {
	 return d;
      }
   }
      
   action() {
      if (this.valid && this.value === this.neutral) {
         // GB BAD : min_lvl for set_value, not lvl as in Colin's code !
	 // actually, no signal level is needed here since the signal is
	 // reset beween two levels, but good potential sanity check for debug
	 // to debug: console.error(this.signal.name, " at ", this.signal_depth,
	 //                          " lvl ", this.min_lvl);
	 this.signal.set_value(this.apply_func(), this.min_lvl, this.astNode.loc);
      }
      return this.neutral;
   }

   toJS() {
      const d = super.toJS();
      const l = this.lvl;

      const axs = this.accessor_list
	 .map(ax => `fillThisArg(${this.toJSArg()}[${l}], "${ax.signame}", ${ax.signal.id}, ${ax.signal.gate_list[0].toJSVar()}, ${ax.signal.pre_gate ? ax.signal.pre_gate.toJSVar() : undefined})`);
      return `${d}; if (${this.toJSVar()}) { ${axs.join("; ")}; this.signalsById["${this.signal.id}"].set_value(${this.toJSAction()}.call(${this.toJSArg()}[${l}]), ${this.min_lvl}, ${JSON.stringify(this.astNode.loc)}); }\n`;
   }
}

/*---------------------------------------------------------------------*/
/*    makeSig ...                                                      */
/*---------------------------------------------------------------------*/
function makeSig(astNode, signal, signame, accessibility, lvl = 0) {
   return new SignalNet(astNode, signal, signame, accessibility, lvl, false);
}

/*---------------------------------------------------------------------*/
/*    makeOr ...                                                       */
/*---------------------------------------------------------------------*/
function makeOr(astNode, debugName, lvl = 0) {
  return new LogicalNet(astNode, debugName, lvl, false);
}

/*---------------------------------------------------------------------*/
/*    makeAnd ...                                                      */
/*---------------------------------------------------------------------*/
function makeAnd(astNode, debugName, lvl = 0) {
  return new LogicalNet(astNode, debugName, lvl, true);
}
