/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/net.js                    */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal, Manuel Serrano, Gerard Berry         */      
/*    Creation    :  Sun Sep  9 06:19:12 2018                          */
/*    Last change :  Tue Jan  7 06:55:39 2025 (serrano)                */
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

export { FAN };
export { RegisterNet, LogicalNet, ActionNet };
export { TestExpressionNet, SignalExpressionNet };
export { makeOr, makeAnd };

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
/*    debug_id; ...                                                    */
/*---------------------------------------------------------------------*/
let debug_id = 0;

/*---------------------------------------------------------------------*/
/*    Net ...                                                          */
/*    -------------------------------------------------------------    */
/*    Net Root class hierarchy.                                        */
/*---------------------------------------------------------------------*/
// @sealed
class Net {
   debug_name;
   debug_id;
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
   isGlobalInputSignalNet;
   signal;
   dfn;
   head;
   #dependencyCount;
   #trueFaninCount;
   #len;
   
   constructor(ast_node, type, debug_name, lvl) {
      ast_node.machine.nets.push(this);
      ast_node.net_list.push(this);

      this.debug_name = ast_node.machine.verbose > 0 ? `${debug_name} [${ast_node.constructor.name}/${this.constructor.name}]:${lvl}/${ast_node.depth}` : undefined;
      this.debug_id = debug_id++;
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
	 name: this.debug_name,
	 id: this.debug_id,
	 lvl: this.lvl,
	 type: this.LogicalNetType(),
	 ast: this.ast_node.constructor.name,
	 sweepable: this.sweepable,
	 loc: this.ast_node.loc,
	 fanout: this.fanout_list
	    .map(fan => { return { id: fan.net.debug_id, dep: fan.dependency }}),
	 fanin: this.fanin_list
	    .map(fan => { return { id: fan.net.debug_id, polarity: fan.polarity, dep: fan.dependency }})
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

   dumpTBR30nov2023() {
      // GB : added net fanin polarity in the dump
      console.log(this.debug_name + " " + this.LogicalNetType());
      if (this.fanout_list.length > 0) {
      	 console.log("   fanout",  
	    this.fanout_list.map(fan => 
	       	  fan.net.debug_id + (fan.dependency ? "-dep" : "")));
      }
      if (this.fanin_list.length > 0) {
      	 console.log("   fanin",  
	    this.fanin_list.map(fan => 
		  (fan.polarity ? "" : "not-") + fan.net.debug_id + (fan.dependency ? "-dep" : "")));
      }
   }

   invalidate() {
      // a net is invalidate when its owner AST node is removed from
      // the program (see ast.removeChild)
      this.valid = false;
   }
   
   propagate(knownList) {
      const trace = this.ast_node.machine.tracePropagation || DEBUG;
      
      if (trace) {
	 console.error(`propagate ${this.debug_id} value:${this.value} (${this.debug_name})`);
      }

      const fanout_list = this.fanout_list;
      const len = fanout_list.length;
      
      for(let i = 0; i < len; i++) {
	 const fanout = fanout_list[i];
	 // applying fanout polarity
         let propagatedValue = (fanout.polarity ? this.value : !this.value);


	 if (trace) fanout.net.receiveTraceEnter();
	 if (fanout.net.receive(propagatedValue, fanout.dependency)) {
	    if (!fanout.net.isInKnownList) {
	       fanout.net.isInKnownList = true;
	       knownList.push(fanout.net);
	    }
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
      console.error(`   => ${this.debug_id} value:${this.value} (${this.debug_name})`);
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
      if (this.neutral == true) {
         return "AND";
      } else if (this.sweepable) {
         return "OR";
      } else {
	 return "SIG";
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

   receiveTraceEnter() {
      console.error("   -> "
	 + this.debug_id + " "
	 + (this.fanin_list.length + 1 -
	    (this.dependencyCount + this.trueFaninCount))
	 + "/" + (this.fanin_list.length + " value:" + this.value)
	 + " (" + this.debug_name + ")");
   }

   receiveTraceExit() {
      console.error("      " + this.debug_id + " " + this.value);
   }

   receive(value, fromDep) {
      if (this.isInKnownList) {
	 // already handled, return immediately,
	 // nothing to be done by the caller.
	 return false;
      }

      if (fromDep) {
	 // new dependency resolved (received value is meaningless)
	 // we should be in an ActionNet with neutral==0 and only one input,
	 // to be checked
	 this.dependencyCount--;
	 
	 this.checkNet();
	 
	 // net becomes known if no more dependencies and value is already
	 // neutral. if value not yet known, will be put in knowList later
	 // when receiving the value of a true fanin
	 // if value is kown not-neutral, has already been propagated
	 if (this.dependencyCount === 0) {
	    if (this.value !== undefined) {
	       return true;
	    } else if (this.trueFaninCount === 0) {
	       this.value = this.neutral;
	       return true;
	    } else {
	       return false;
	    }
	 }
      } else {
	 // true fanin
	 this.trueFaninCount--;
	 
	 this.checkNet();
	 
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
	       return (this.dependencyCount === 0);
	    } else {
	       // wait for more inputs
	       return false;
	    }
	 }
      }
   }

   checkNet() {
      if (this.dependencyCount < 0 || this.trueFaninCount < 0) {
	 throw new error.TypeError("Out of range fanin/dependency count." +
				    " [" + this.trueFaninCount + " " +
				    this.dependencyCount + " " +
				    this.fanin_list.length + "]",
				    this.ast_node.loc);
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

   constructor(ast_node, type, debug_name, lvl, func, accessor_list) {
      super(ast_node, type, debug_name, lvl, true);

      this.func = func;
      this.accessor_list = accessor_list;
      this.actionArgs = new Array(lvl + 1).fill(false);
      signal.runtimeSignalAccessor(ast_node, accessor_list, lvl, this);
      this.sweepable = false;
      // pre-allocate the objects that wil be passed as 
      // the "this" to user actions
      for(let i = 0; i <= lvl; i++) {
	 this.actionArgs[i] = 
	    new signal.ActionArg(ast_node.machine, accessor_list);
      }
   }

   LogicalNetType () {
      return "ACTION" + (this.neutral ? "+" : "-");
   }

   dump() {
      function pp(fun) {
	 const s = fun.toString()
	    .replace(/function \(\) {/, "")
	    .replace(/return \(\(\(\) => {/, "")
	    .replace(/}\)\(\)\);/, "")
	    .replace(/}/, "")
	    .trim()
	 return s;
      }

      const d = super.dump();

      if (this.ast_node.machine.verbose > 0) {
	 return Object.assign(d, {
	    signals: this.accessor_list.map(x => x.signame).join(),
	    action: pp(this.func)
	 });
      } else {
	 return d;
      }
   }
   
   receive(value, fromDep) {
      if (super.receive(value, fromDep)) {
	 if (this.value === true) {
	    this.action();
	 }
	 return true;
      }
      return false;
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
	 this.apply_func();
      }
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

   action() {
      if (this.valid) {
	 this.value = !!this.apply_func();
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
   
   constructor(ast_node, type, signal, debug_name, lvl, func, accessor_list) {
      super(ast_node, type, debug_name, lvl, func, accessor_list);

      this.signal = signal;
      this.signal_depth = this.signal.ast_node.depth;
      this.min_lvl = lvl > this.signal_depth ? this.signal_depth : lvl;
      this.connectTo(signal.dependency_gate_list[this.min_lvl], FAN.DEP);
   }

   action() {
      if (this.valid) {
         // GB BAD : min_lvl for set_value, not lvl as in Colin's code !
	 // actually, no signal level is needed here since the signal is
	 // reset beween two levels, but good potential sanity check for debug
	 // to debug: console.error(this.signal.name, " at ", this.signal_depth,
	 //                          " lvl ", this.min_lvl);
	 this.signal.set_value(this.apply_func(), this.min_lvl, this.ast_node.loc);
      }
   }
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

