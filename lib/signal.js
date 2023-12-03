/*=====================================================================*/
/*    serrano/prgm/project/hiphop/1.3.x/lib/signal.js                  */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Fri Dec 24 09:29:22 2021                          */
/*    Last change :  Sun Dec  3 09:06:56 2023 (serrano)                */
/*    Copyright   :  2021-23 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    HipHop signal handling                                           */
/*=====================================================================*/
"use strict";
"use hopscript";

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
import * as error from "./error.js";
import { FAN, makeOr, makeAnd } from "./net.js";

export { Signal };
export { ActionArg, ExecActionArg };
export { create_scope, resume_scope, runtimeSignalAccessor };
       
/*---------------------------------------------------------------------*/
/*    debugkey ...                                                     */
/*---------------------------------------------------------------------*/
let debugkey = 0;

/*---------------------------------------------------------------------*/
/*    Signal ...                                                       */
/*---------------------------------------------------------------------*/
// @sealed
class Signal {
   ast_node;
   name;
   combine_func;
   init_func;
   init_accessor_list;
   reinit_func;
   reinit_accessor_list;
   emitted;
   value;
   pre_value;
   debugKey;
   gate_list;
   dependency_gate_list;
   pre_reg;
   pre_gate;
   
   constructor(ast_node, prop, type, pre_reg, k1_list=null, kill_list=null, susp=null) {
      this.ast_node = ast_node;
      this.name = prop.name;
      this.combine_func = prop.combine_func;
      this.init_func = prop.init_func;
      this.init_accessor_list = prop.init_accessor_list;
      this.reinit_func = prop.reinit_func;
      this.reinit_accessor_list = prop.reinit_accessor_list;
      this.emitted = new Array(ast_node.depth).fill(false);
      this.value = undefined;
      this.pre_value = undefined;
      this.debugKey = debugkey++;

      //
      // Needed for signal lookup and pretty printer. See
      // compiler.js/ast.js.
      //
      prop.signal = this;

      this.gate_list = [];
      this.dependency_gate_list = [];
      this.pre_reg = pre_reg;
      this.pre_gate = makeOr(ast_node, type, this.name + "_pre_gate");
      this.pre_gate.noSweep = true;

      //
      // The pre_gate is not the register but a door which the register
      // is connected to. That ensure that pre_reg hold the value of
      // previous instant.
      //
      this.pre_reg.connectTo(this.pre_gate, FAN.STD);

      //
      // Building a local signal. Lot of stuff is needed to handle pre on
      // a local.
      //
      if (k1_list && kill_list && susp) {
   	 let or_to_pre = makeOr(ast_node, type, this.name + "_or_to_pre");
   	 let pre_and_susp = makeAnd(ast_node, type, this.name + "_pre_and_susp");
   	 let to_pre_p = [];
   	 let to_pre_not_susp = makeOr(ast_node, type, 
	    this.name + "_to_pre_not_susp");

   	 for (let i = 0; i <= ast_node.depth; i++) {
      	    //
      	    // signal door generation
      	    //
      	    this.gate_list[i] = makeOr(ast_node, type, this.name, i);
      	    this.gate_list[i].noSweep = true;
      	    this.dependency_gate_list[i] = makeOr(ast_node, type,
	       this.name + "_dep", i);

      	    //
      	    // signal intermediate pre door generation
      	    //
      	    to_pre_p[i] = makeAnd(ast_node, type, this.name + "_to_pre_p", i);
      	    this.gate_list[i].connectTo(to_pre_p[i], FAN.STD);
      	    k1_list[i].connectTo(to_pre_p[i], FAN.STD);
      	    kill_list[i].connectTo(to_pre_p[i], FAN.NEG);

      	    if (i < ast_node.depth) {
	       to_pre_p[i].connectTo(to_pre_not_susp, FAN.STD);
      	    } else {
	       let and = makeAnd(ast_node, type,
	    	  this.name + "_to_pre_q_and_susp");

	       to_pre_p[i].connectTo(and, FAN.STD);
	       susp.connectTo(and, FAN.NEG);
	       and.connectTo(to_pre_not_susp, FAN.STD);
      	    }
   	 }

   	 //
   	 // pre AND susp
   	 //
   	 this.pre_reg.connectTo(pre_and_susp, FAN.STD);
   	 susp.connectTo(pre_and_susp, FAN.STD);

   	 //
   	 // topre_not_susp OR pre_and_susp
   	 //
   	 pre_and_susp.connectTo(or_to_pre, FAN.STD);
   	 to_pre_not_susp.connectTo(or_to_pre, FAN.STD);
   	 or_to_pre.connectTo(this.pre_reg, FAN.STD);
      } else {
   	 //
   	 // On global signal, there is only one incarnation, and pre
   	 // depends only of this incarnation
   	 //
   	 let signal_gate = makeOr(ast_node, type, this.name);

   	 //
   	 // Don't remove global input signal gate if there is no emission
   	 // of this signal in the program
   	 //
   	 signal_gate.noSweep = true;
   	 this.gate_list[0] = signal_gate;
   	 this.dependency_gate_list[0] = makeOr(ast_node, type, this.name + "_dep");
   	 signal_gate.connectTo(this.pre_reg, FAN.STD);
      }
   }

   toString() {
      return `[Signal name:${this.name}, dbgkey:${this.debugKey}]`;
   }   

   reset(erase_value) {
      // console.log("Reset " + this.name + " " + erase_value); // GB
      this.emitted.fill(false);
      if (erase_value) {
      	 this.value = undefined;
      	 let p = this.ast_node.machine.DOMproxiesValue[this.name];
      	 if (p) {
	    p.value = this.value;
      	 }
      }
      this.pre_value = this.value;
   }
   
   set_value(value, lvl, loc=false) {
      // console.error ("Emitting ", this.name, " value ", value, " lvl ", lvl, " emitted ", this.emitted[lvl]); // GB
      if (this.combine_func) {
      	 // combined signal
      	 if (this.emitted[lvl]) {
	    this.value = this.combine_func(this.value, value);
	    // console.error ("combination result ", this.value);
      	 } else {
	    this.value = value;
	    // console.error ("first emission ", value);
      	 }
      } else {
       	 if (this.emitted[lvl]) {
	    throw error.TypeError("Can't set single signal `" + this.name
				  + "' value more than once.",
	       loc || this.ast_node.loc);  
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
   constructor(machine, accessor_list) {
      this.machine = machine;
      
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
	    const min_lvl = lvl > sig.ast_node.depth ? sig.ast_node.depth : lvl;
	    
            this[signame].signame = ax.signal ? ax.signal.name : ax.signame;
            this[signame].nowval = sig.value;
            this[signame].preval = sig.pre_value;
            this[signame].now = sig.gate_list[min_lvl].value;
            this[signame].pre = sig.pre_gate.value;
      	 });
   }
}

/*---------------------------------------------------------------------*/
/*    ExecActionArg ...                                                */
/*    -------------------------------------------------------------    */
/*    Objects reifying execs executions.                               */
/*---------------------------------------------------------------------*/
class ExecActionArg extends ActionArg {
   constructor(mach, state) {
      super(mach, state.astNode.accessor_list);
      
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
	 console.error("doNotify state.id=", state.id, "this.id=", this.id, value);
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
      s.pre_value = s.value;
   }
}

/*---------------------------------------------------------------------*/
/*    runtimeSignalAccessor ...                                        */
/*---------------------------------------------------------------------*/
function runtimeSignalAccessor(ast_node, accessor_list, lvl, dep_target_gate=null) {
   accessor_list.forEach(acc => {
	 let gate = null;
	 let sig = acc.signal;

	 let min_lvl = lvl > sig.ast_node.depth ? sig.ast_node.depth : lvl;

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
