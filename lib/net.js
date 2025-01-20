/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/net.js                    */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal, Manuel Serrano, Gerard Berry         */      
/*    Creation    :  Sun Sep  9 06:19:12 2018                          */
/*    Last change :  Mon Jan 20 06:53:37 2025 (serrano)                */
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

export { resetNetId };
export { FAN };
export { RegisterNet, LogicalNet, SignalNet, ActionNet };
export { TestExpressionNet, SignalExpressionNet };
export { makeSig, makeOr, makeAnd };

/*---------------------------------------------------------------------*/
/*    DEBUG                                                            */
/*---------------------------------------------------------------------*/
const DEBUG = process.env.HIPHOPTRACE
   && process.env.HIPHOPTRACE.split(",").find(n => n === "receive");

/*---------------------------------------------------------------------*/
/*    fanin/fanout connections                                         */
/*---------------------------------------------------------------------*/
const FAN = { STD: 1, NEG: 2, DEP: 3 };

/*---------------------------------------------------------------------*/
/*    global_id; ...                                                   */
/*---------------------------------------------------------------------*/
let global_id = 0;

/*---------------------------------------------------------------------*/
/*    resetNetId ...                                                   */
/*---------------------------------------------------------------------*/
function resetNetId(cnt = 0) {
   global_id = cnt;
}

/*---------------------------------------------------------------------*/
/*    Net ...                                                          */
/*    -------------------------------------------------------------    */
/*    Net Root class hierarchy.                                        */
/*---------------------------------------------------------------------*/
// @sealed
class Net {
   id;
   ast_node;
   fanin_list;
   fanout_list;
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
   
   constructor(ast_node, type, debug_name, lvl) {
      ast_node.machine.nets.push(this);
      ast_node.net_list.push(this);

      this.debug_name = ast_node.machine.verbose > 0 ? `${debug_name} [${ast_node.constructor.name}/${this.constructor.name}]:${lvl}/${ast_node.depth}` : undefined;
      this.id = global_id++;
      this.ast_node = ast_node;
      this.fanin_list = [];
      this.fanout_list = [];
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

   dump() {
      // GB : added net fanin polarity in the dump
      return {
	 id: this.id,
	 lvl: this.lvl,
	 type: this.LogicalNetType(),
	 fanout: this.fanout_list
	    .map(fan => { return { id: fan.net.id, dep: fan.dependency }}),
	 fanin: this.fanin_list
	    .map(fan => { return { id: fan.net.id, polarity: fan.polarity, dep: fan.dependency }}),
	 $name: this.debug_name,
	 $ast: this.ast_node.constructor.name,
	 $sweepable: this.sweepable,
	 $loc: this.ast_node.loc,
      }
   }

   reset(reset_machine) {
      this.isInKnownList = false;

      const fanin_list = this.fanin_list;
      const len = fanin_list.length;
      
      if (len !== this.#len) {
	 this.#dependencyCount = 0;
	 this.#trueFaninCount = 0;
	 this.#len = len;
	 
      	 for (let i = 0; i < len; i++) {
	    const fanin = fanin_list[i];
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
   
   propagate(knownList, age) {
      const trace = this.ast_node.machine.tracePropagation || DEBUG;
      
      if (trace) {
	 console.error(`[${age}] propagate ${this.id} v=${this.value} (${this.debug_name})`);
      }

      const fanout_list = this.fanout_list;
      const len = fanout_list.length;
      
      for(let i = 0; i < len; i++) {
	 const fanout = fanout_list[i];

         let propagatedValue = (fanout.polarity ? this.value : !this.value);
	 
	 if (trace) fanout.net.receiveTraceEnter(fanout.dependency);
	 
	 if (fanout.net.receive(propagatedValue, fanout.dependency)) {
	    fanout.net.isInKnownList = true;
	    knownList.push(fanout.net);
	 }
	 
	 if (trace) fanout.net.receiveTraceExit();
      }
   }

   receiveTraceEnter() {
   }

   receiveTraceExit() {
   }
   
   receive(_1, _2) {
      throw new error.InternalError(`not implemented ${this.constructor.name}`);
   }

   connectTo(net, type) {
      function makeFan(net, type) {
	 return { 
	    net: net,
	    polarity: type !== FAN.NEG,
	    dependency: type === FAN.DEP,
	    antagonist: null
	 }
      }

      if (type === undefined || type < FAN.STD || type > FAN.DEP) {
	 throw new error.TypeError("illegal fan", this.ast_node.loc);
      }

      if (!net) {
	 throw new error.TypeError(`${this.debug_name}: undefined net`,
  				    this.ast_node.loc);
      }

      if (net instanceof RegisterNet) {
	 if (net.fanin_list.length === 1) {
	    throw new error.TypeError("too many fanin for register",
				       net.ast_node.loc);
	 }
	 if (type === FAN.DEP) {
	    throw new error.TypeError("illegal dependency",
				       net.ast_node.loc);
	 }
      }

      let fanout = makeFan(net, type);
      let fanin = makeFan(this, type);
      fanout.antagonist = fanin;
      fanin.antagonist = fanout;
      
      this.fanout_list.push(fanout);
      net.fanin_list.push(fanin);
   }

   toJSVar() {
      return "r" + this.id;
   }
   
   toJS() {
      return `/* not implemented ${this.constructor.name} */`;
   }
}

/*---------------------------------------------------------------------*/
/*    RegisterNet ...                                                  */
/*---------------------------------------------------------------------*/
// @sealed
class RegisterNet extends Net {
   dynamic;
   stable_id;
   
   constructor(ast_node, type, debug_name, lvl) {
      super(ast_node, type, debug_name, lvl);

      this.stable_id = ast_node.instr_seq + "_" + ast_node.next_register_id++;

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

      if (this.ast_node.machine.verbose > 0) {
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
      console.error(`   => ${this.id} value:${this.value} (${this.debug_name})`);
   }
   
   receive(value, _) {
      this.trueFaninCount--;

      if (this.trueFaninCount < 0) {
	 throw new error.TypeError("Out of range Register.trueFaninCount",
				    this.ast_node.loc);
      }
      this.value = value;
      return false;
   }

   toJS() {
      return this.value.toString();
   }
}

/*---------------------------------------------------------------------*/
/*    LogicalNet                                                       */
/*---------------------------------------------------------------------*/
// @sealed
class LogicalNet extends Net {
   neutral;
   
   constructor(ast_node, type, debug_name, lvl, neutral) {
      super(ast_node, type, debug_name, lvl);

      if (neutral != undefined && neutral != true && neutral != false) {
	 throw new error.TypError("`neutral` must be a boolean",
				   this.ast_node.loc);
      }
      this.neutral = neutral;
   }

   LogicalNetType () {
      if (this.neutral === true) {
         return this.fanin_list.length === 0 ? "TRUE" : "AND";
      } else {
         return this.fanin_list.length === 0 ? "FALSE" : "OR";
      }
   }

   reset(reset_machine) {
      super.reset(reset_machine);

      if (this.fanin_list.length === 0) {
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
				    this.fanin_list.length + "]",
				    this.ast_node.loc);
      }
      if (this.neutral !== nvalue && nvalue !== undefined) {
	 throw new Error.TypeError(`Bad net neutral value ${this.id}`);
      }
   }

   toJS() {
      if (this.fanin_list.length === 0) {
	 return this.neutral.toString();
      } else {
	 const deps = this.fanin_list
	    .filter(f => !f.dependency)
	    .map(f => (f.polarity === false ? "!" : "") + f.net.toJSVar());
	 return `${deps.join(this.neutral ? " ^ " : " | ")}`;
      }
   }
}

/*---------------------------------------------------------------------*/
/*    SignalNet                                                        */
/*---------------------------------------------------------------------*/
// @sealed
class SignalNet extends LogicalNet {
   accessibility = 0;
   signal
   signame;
   
   constructor(ast_node, type, signal, signame, accessibility, lvl, neutral) {
      super(ast_node, type, signame, lvl, neutral);
      //this.sweepable = false;
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
   
   toJS() {
      if (this.accessibility & ast.IN) {
	 return `machine["${this.debug_name}"].emitted[${this.lvl}] || ${super.toJS()}`;
      } else {
	 return super.toJS();
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

   constructor(ast_node, type, debug_name, lvl, func, accessor_list) {
      super(ast_node, type, debug_name, lvl, true);

      this.func = func;
      this.accessor_list = accessor_list;
      this.actionArgs = new Array(lvl + 1).fill(false);
      //this.sweepable = false;
      signal.runtimeSignalAccessor(ast_node, accessor_list, lvl, this);
      // pre-allocate the objects that will be passed as 
      // the "this" to user actions
      for(let i = 0; i <= lvl; i++) {
	 this.actionArgs[i] = 
	    new signal.ActionArg(ast_node.machine, accessor_list);
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

      if (this.ast_node.machine.verbose > 0) {
	 return Object.assign(d, {
	    $signals: this.accessor_list.map(x => x.signame + "?").join(),
	    $action: pp(this.func)
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
	    let min_lvl = lvl > sig.ast_node.depth ? sig.ast_node.depth : lvl;
	    
	    return sig.gate_list[min_lvl].value;
	 }
      }
   }

   action() {
      if (this.valid) {
	 //console.error("EXEC.0", this.id);
	 this.evaluated = true;
	 //console.log("EXEC.1", this.id);
	 this.apply_func();
      }
   }

   

   toJS() {
      const d = super.toJS();
      return d + (this.neutral ? " ^ " : " | ") + this.func.toString();
   }
}

/*---------------------------------------------------------------------*/
/*    TestExpressionNet ...                                            */
/*---------------------------------------------------------------------*/
// @sealed
class TestExpressionNet extends ActionNet {
   constructor(ast_node, type, debug_name, lvl, func, accessor_list) {
      super(ast_node, type, debug_name, lvl, func, accessor_list);
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
	 //console.error("EXEC.2", this.id, v);
	 return v;
      }
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
   
   constructor(ast_node, type, signal, debug_name, lvl, func, accessor_list) {
      super(ast_node, type, debug_name, lvl, func, accessor_list);

      this.signal = signal;
      this.signal_depth = this.signal.ast_node.depth;
      this.min_lvl = lvl > this.signal_depth ? this.signal_depth : lvl;
      this.connectTo(signal.dependency_gate_list[this.min_lvl], FAN.DEP);
   }

   LogicalNetType () {
      return (this.neutral ? "SIGACTION" : "SIGACTION-");
   }

   dump() {
      const d = super.dump();
      if (this.ast_node.machine.verbose > 0) {
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
	 this.signal.set_value(this.apply_func(), this.min_lvl, this.ast_node.loc);
      }
      return this.neutral;
   }
}

/*---------------------------------------------------------------------*/
/*    makeSig ...                                                      */
/*---------------------------------------------------------------------*/
function makeSig(ast_node, type, signal, signame, accessibility, lvl=0) {
   return new SignalNet(ast_node, type, signal, signame, accessibility, lvl, false);
}

/*---------------------------------------------------------------------*/
/*    makeOr ...                                                       */
/*---------------------------------------------------------------------*/
function makeOr(ast_node, type, debug_name, lvl=0) {
  return new LogicalNet(ast_node, type, debug_name, lvl, false);
}

/*---------------------------------------------------------------------*/
/*    makeAnd ...                                                      */
/*---------------------------------------------------------------------*/
function makeAnd(ast_node, type, debug_name, lvl=0) {
  return new LogicalNet(ast_node, type, debug_name, lvl, true);
}
