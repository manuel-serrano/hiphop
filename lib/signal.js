/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/signal.js                 */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Fri Dec 24 09:29:22 2021                          */
/*    Last change :  Tue Mar  4 15:54:00 2025 (serrano)                */
/*    Copyright   :  2021-25 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    HipHop signal handling                                           */
/*=====================================================================*/
"use strict";
"use hopscript";

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
import * as error from "./error.js";
import { FAN, makeSig, makeOr, makeAnd } from "./net.js";
import { IN, OUT, INOUT, LOCAL } from "./ast.js";

export { Signal };
export { ActionArg, ExecActionArg };
export { create_scope, resume_scope, runtimeSignalAccessor };

/*---------------------------------------------------------------------*/
/*    signalId ...                                                     */
/*---------------------------------------------------------------------*/
let signalId = 0;

/*---------------------------------------------------------------------*/
/*    Signal ...                                                       */
/*---------------------------------------------------------------------*/
// @sealed
class Signal {
   astNode;
   id;
   name;
   combine_func;
   init_func;
   init_accessor_list;
   reinit_func;
   reinit_accessor_list;
   emitted;
   value;
   pre_value;
   gate_list;
   dependency_gate_list;
   pre_reg;
   pre_gate;
   depth;
   initializedp = false;
   
   constructor(astNode, prop, pre_reg, k1_list = null, kill_list = null, susp = null, depth) {
      this.astNode = astNode;
      this.id = signalId++;
      this.name = prop.name;
      this.combine_func = prop.combine_func;
      this.init_func = prop.init_func;
      this.init_accessor_list = prop.init_accessor_list;
      this.reinit_func = prop.reinit_func;
      this.reinit_accessor_list = prop.reinit_accessor_list;
      this.emitted = new Array(astNode.depth).fill(false);
      this.value = undefined;
      this.pre_value = undefined;
      this.depth = depth;

      // bind the signal into its machine
      astNode.machine.signalsById[this.id] = this;
      
      // debug
      if (!((k1_list === null) || (k1_list instanceof Array))) {
	 throw new Error("Signal: illegal call k1_list: " + k1_list);
      }
      
      //
      // Needed for signal lookup and pretty printer. See
      // compiler.js/ast.js.
      //
      prop.signal = this;

      this.gate_list = [];
      this.dependency_gate_list = [];

      if (pre_reg) {
	 this.pre_reg = pre_reg;
	 this.pre_gate = makeSig(astNode, undefined, this.name + "_pre_gate", "LOCAL");

	 //
	 // The pre_gate is not the register but a door which the register
	 // is connected to. That ensures that pre_reg hold the value of
	 // previous instant.
	 //
	 this.pre_reg.connectTo(this.pre_gate, FAN.STD);
      }

      //
      // Building a local signal. Lot of stuff is needed to handle pre on
      // a local.
      //
      if (k1_list && kill_list && susp) {
   	 let or_to_pre = makeOr(astNode, this.name + "_or_to_pre");
   	 let pre_and_susp = makeAnd(astNode, this.name + "_pre_and_susp");
   	 let to_pre_p = [];
   	 let to_pre_not_susp = makeOr(astNode, this.name + "_to_pre_not_susp");

   	 for (let i = 0; i <= depth; i++) {
      	    //
      	    // signal door generation
      	    //
      	    this.gate_list[i] = makeSig(astNode, this, this.name, "LOCAL", i);
	    // MS 16jan2025, used to be an OR gate, which is I beleive
	    // incorrect if we want to try to use the value propagated
	    // true FAN.DEP fans
/*       	    this.dependency_gate_list[i] = makeOr(astNode, */
/* 	       this.name + "_dep", i);                                 */
      	    this.dependency_gate_list[i] =
	       makeAnd(astNode, this.name + "_dep_local", i);
      	    //
      	    // signal intermediate pre door generation
      	    //
      	    to_pre_p[i] = makeAnd(astNode, this.name + "_to_pre_p", i);
      	    this.gate_list[i].connectTo(to_pre_p[i], FAN.STD);

      	    k1_list[i].connectTo(to_pre_p[i], FAN.STD);
      	    kill_list[i].connectTo(to_pre_p[i], FAN.NEG);

      	    if (i < depth) {
	       to_pre_p[i].connectTo(to_pre_not_susp, FAN.STD);
      	    } else {
	       let and = makeAnd(astNode, this.name + "_to_pre_q_and_susp");

	       to_pre_p[i].connectTo(and, FAN.STD);
	       susp.connectTo(and, FAN.NEG);
	       and.connectTo(to_pre_not_susp, FAN.STD);
      	    }
   	 }

   	 //
   	 // pre AND susp
   	 //
	 if (this.pre_reg) {
   	    this.pre_reg.connectTo(pre_and_susp, FAN.STD);
	 }
   	 susp.connectTo(pre_and_susp, FAN.STD);

   	 //
   	 // topre_not_susp OR pre_and_susp
   	 //
   	 pre_and_susp.connectTo(or_to_pre, FAN.STD);
   	 to_pre_not_susp.connectTo(or_to_pre, FAN.STD);
	 if (this.pre_reg) {
   	    or_to_pre.connectTo(this.pre_reg, FAN.STD);
	 }
      } else {
   	 //
   	 // On global signal, there is only one incarnation, and pre
   	 // depends only of this incarnation
   	 //
   	 let signal_gate = makeSig(astNode, this, this.name, prop.accessibility);

   	 //
   	 // Don't remove global input signal gate if there is no emission
   	 // of this signal in the program
   	 //
   	 this.gate_list[0] = signal_gate;
	 // MS 16jan2025, used to be an OR gate, see above
/*    	 this.dependency_gate_list[0] = makeOr(astNode, this.name + "_dep"); */
   	 this.dependency_gate_list[0] =
	    makeAnd(astNode, this.name + "_dep_global");

	 if (this.pre_reg) {
   	    signal_gate.connectTo(this.pre_reg, FAN.STD);
	 }
      }
   }

   toString() {
      return `[Signal name:${this.name}, id:${this.id}]`;
   }   

   reset(erase_value) {
      // console.log("Reset " + this.name + " " + erase_value); // GB
      this.emitted.fill(false);
      if (erase_value) {
      	 this.value = undefined;
      	 let p = this.astNode.machine.DOMproxiesValue[this.name];
      	 if (p) {
	    p.value = this.value;
      	 }
      }
      this.pre_value = this.value;
   }
   
   set_value(value, lvl, loc = false) {
      if (this.combine_func) {
      	 // combined signal
      	 if (this.emitted[lvl]) {
	    this.value = this.combine_func(this.value, value);
      	 } else {
	    this.value = value;
      	 }
      } else {
       	 if (this.emitted[lvl]) {
	    throw error.TypeError("Can't set single signal `" + this.name
				  + "' value more than once.",
	       loc || this.astNode.loc);  
       	 } else {
	    this.value = value;
       	 }
      }
      this.emitted[lvl] = true;
   }
}

/*---------------------------------------------------------------------*/
/*    ActionArg ...                                                    */
/*---------------------------------------------------------------------*/
class ActionArg {
   constructor(accessor_list) {
      accessor_list.forEach(ax => {
	    this[ax.signame] = {
	       signame: ax.signal ? ax.signal.name : ax.signame,
	       nowval: undefined,
	       preval: undefined,
	       now: undefined,
	       pre: undefined
	    };
      	 });
   }
   
   fill(accessor_list, lvl) {
      accessor_list.forEach(ax => {
	    const sig = ax.signal;
	    const signame = ax.signame;
	    const min_lvl = lvl > sig.astNode.depth ? sig.astNode.depth : lvl;
	    
            this[signame].signame = ax.signal ? ax.signal.name : ax.signame;
            this[signame].nowval = sig.value;
            this[signame].preval = sig.pre_value;
            this[signame].now = sig.gate_list[min_lvl].value;
            this[signame].pre = sig.pre_gate?.value;
      	 });
   }
}

/*---------------------------------------------------------------------*/
/*    ExecActionArg ...                                                */
/*    -------------------------------------------------------------    */
/*    Objects reifying exec executions.                                */
/*---------------------------------------------------------------------*/
class ExecActionArg extends ActionArg {
   constructor(mach, state) {
      super(state.astNode.accessor_list);
      
      this.machine = mach;
      this.state = state;
      this.id = state.id;
      
      this.fill(state.astNode.accessor_list, state.lvl);
   }
   
   doNotify(state, value, reactp) {
      if (value instanceof Promise) {
	 value
	    .then(val => {
	       if (state.id === this.id) {
		  this.machine.update(state, { resolve: true, val: val }, reactp);
	       }
	    })
	    .catch(val => {
	       if (state.id === this.id) {
		  this.machine.update(state, { resolve: false, val: val }, reactp);
	       }
	    });
      } else {
	 if (state.id === this.id) {
	    this.machine.update(state, value, reactp);
	 }
      }
   }
   
   notify(value = undefined, react = true) {
      this.doNotify(this.state, value, react);
   }
   
   react(sigset) {
      this.machine.react(sigset);
   }
}

/*---------------------------------------------------------------------*/
/*    create_scope ...                                                 */
/*---------------------------------------------------------------------*/
function create_scope(s, lvl) {
   // create_scope and resume_scope are used to call init/reinit
   // functions of signal, according to the context. As init/reinit func can
   // use signal values/status, those functions must be called by
   // runtime, with dependencies well built.
   //
   // Since all (global and local) signals are reset at the end of the
   // reaction, only global input signal can be emitted when entering
   // these functions. In that case, we must do nothing.
   if (s.emitted[lvl]) {
      // MS 2feb204, fix an init bug. Signals input (from JS) at the very
      // first reaction had no preval value initilaized
      if (!s.initializedp) {
	 s.initializedp = true;
	 if (s.init_func) {
	    s.pre_value = s.init_func.call(this);
	 }
      }
      return;
   }

   if (s.init_func) {
      s.value = s.init_func.call(this);
      s.pre_value = s.value;
   }
}

/*---------------------------------------------------------------------*/
/*    resume_scope ...                                                 */
/*---------------------------------------------------------------------*/
function resume_scope(s, lvl) {
   if (s.emitted[lvl]) {
      return;
   }

   if (s.reinit_func) {
      s.value = s.reinit_func.call(this);
      // MS 17Jan2024, fix a reinit bug, pre_value should not be
      // assigned the instantaenous value in order to preserve
      // the value of the previous instant!
      // s.pre_value = s.value;
   }
}

/*---------------------------------------------------------------------*/
/*    runtimeSignalAccessor ...                                        */
/*---------------------------------------------------------------------*/
function runtimeSignalAccessor(astNode, accessor_list, lvl, dep_target_gate = null) {
   accessor_list.forEach(acc => {
	 let gate = null;
	 let sig = acc.signal;

	 let min_lvl = lvl > sig.astNode.depth ? sig.astNode.depth : lvl;

	 if (acc.get_value) {
	    gate = (acc.get_pre
		       ? sig.pre_gate
		       : sig.dependency_gate_list[min_lvl]);
	 } else {
	    gate = (acc.get_pre 
		       ? sig.pre_gate
		       : sig.gate_list[min_lvl]);
	 }

      if (dep_target_gate) {
	    gate.connectTo(dep_target_gate, FAN.DEP);
	 }
      });
}
