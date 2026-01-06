/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/signal.js                 */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Fri Dec 24 09:29:22 2021                          */
/*    Last change :  Tue Jan  6 10:48:50 2026 (serrano)                */
/*    Copyright   :  2021-26 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    HipHop signal handling                                           */
/*=====================================================================*/
"use strict";
"use hopscript";

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
import * as error from "./error.js";
import { FAN, makeSig, makeOr, makeAnd, RegisterNet } from "./net.js";
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
   netList;
   dependency_netList;
   preReg;
   preNet;
   init_gates;
   depth;
   initializedp = false;
   
   constructor(astNode, prop, pre, k1List = null, killList = null, susp = null, depth) {
      this.astNode = astNode;
      this.id = signalId++;
      this.name = prop.name;
      this.combine_func = prop.combine_func;
      this.init_func = prop.init_func;
      this.init_accessor_list = prop.init_accessor_list;
      this.reinit_func = prop.reinit_func;
      this.reinit_accessor_list = prop.reinit_accessor_list;
      this.emitted = new Array(astNode.depth).fill(false);
      this.values = new Array(astNode.depth).fill(undefined);
      this.value = undefined;
      this.pre_value = undefined;
      this.init_gates = [];
      this.depth = depth;
      
      const isSignalLocal = (susp !== null);

      // MS 6jan26, debug TBR
      if (!((k1List === null) || (k1List instanceof Array))) {
	 throw new Error("Signal: illegal call k1List: " + k1List);
      }
      
      // MS 6jan26, debug TBR
      if (k1List || killList || susp) {
	 if (!k1List) console.error("SIGNAL: NOT K1LIST");
	 if (!killList) console.error("SIGNAL: NOT KILLLIST");
	 if (!susp) console.error("SIGNAL: NOT SUSP");
      }

      // bind the signal into its machine
      astNode.machine.signalsById[this.id] = this;
      
      // Needed for signal lookup and pretty printer. See
      // compiler.js/ast.js.
      prop.signal = this;

      this.netList = new Array(depth + 1);
      this.dependency_netList = new Array(depth + 1);

      if (pre) {
	 const preCtor = isSignalLocal ? "LOCAL" : "MODULE";
	 
	 this.preReg = new RegisterNet(astNode, prop.name + ".pre", depth);
	 this.preNet = makeSig(astNode, undefined, this.name + ".pre", preCtor, depth);
	 this.preReg.connectTo(this.preNet, FAN.STD);
      } else {
	 this.preNet = false;
	 this.preReg = false;
      }

      if (isSignalLocal) {
   	 for (let i = 0; i <= depth; i++) {
      	    // signal gate generation
      	    this.netList[i] = makeSig(astNode, this, this.name, "LOCAL", i);
	    // MS 16jan2025, used to be an OR gate, which is I beleive
	    // incorrect if we want to try to use the value propagated
	    // true FAN.DEP fans
      	    this.dependency_netList[i] =
	       makeAnd(astNode, this.name + "_dep_local", i);
   	 }

   	 // pre AND susp
	 if (pre) {
	    let to_pre = new Array(depth + 1);
	    
	    if (astNode.machine.loopUnroll) {
	       if (depth !== 0) console.error("SIGNAL: incoherent compilation mode");
	       // no re-incarnation
      	       to_pre[0] = makeAnd(astNode, this.name + "_to_pre", 0);
	       
      	       k1List[0].connectTo(to_pre[0], FAN.STD);
      	       killList[0].connectTo(to_pre[0], FAN.NEG);
      	       this.netList[0].connectTo(to_pre[0], FAN.STD);
	       susp.connectTo(to_pre[0], FAN.NEG);

   	       let or_to_prereg = makeOr(astNode, this.name + "_or_to_prereg");
   	       let prereg_and_susp = makeAnd(astNode, this.name + "_prereg_and_susp");
	       
   	       this.preReg.connectTo(prereg_and_susp, FAN.STD);
   	       susp.connectTo(prereg_and_susp, FAN.STD);
	       
   	       prereg_and_susp.connectTo(or_to_prereg, FAN.STD);
   	       to_pre[0].connectTo(or_to_prereg, FAN.STD);
	       
   	       or_to_prereg.connectTo(this.preReg, FAN.STD);
	    } else if (astNode.machine.compiler === "new") {
	       // new compiler
	       if (depth !== k1List.length) console.error("SIGNAL: incoherent compilation mode");
   	       let to_pre_not_susp = makeOr(astNode, this.name + "_to_pre_not_susp");
	       
   	       for (let i = 0; i <= depth; i++) {
      		  to_pre[i] = makeAnd(astNode, this.name + "_to_pre", i);
      		  this.netList[i].connectTo(to_pre[i], FAN.STD);

      		  if (i === depth) {
		     susp.connectTo(to_pre[i], FAN.NEG);
      		     k1List[i - 1].connectTo(to_pre[i], FAN.STD);
      		     killList[i - 1].connectTo(to_pre[i], FAN.NEG);
      		  } else {
      		     k1List[i].connectTo(to_pre[i], FAN.STD);
      		     killList[i].connectTo(to_pre[i], FAN.NEG);
		  }
		  to_pre[i].connectTo(to_pre_not_susp, FAN.STD);
	       }
	       
   	       let pre_and_susp = makeAnd(astNode, this.name + "_pre_and_susp");
   	       let or_to_pre = makeOr(astNode, this.name + "_or_to_pre");
	       
   	       this.preReg.connectTo(pre_and_susp, FAN.STD);
   	       susp.connectTo(pre_and_susp, FAN.STD);

   	       pre_and_susp.connectTo(or_to_pre, FAN.STD);
   	       to_pre_not_susp.connectTo(or_to_pre, FAN.STD);
   	       or_to_pre.connectTo(this.preReg, FAN.STD);
	    } else {
	       // old reincarnation compiler
	       if (depth === 0) console.error("SIGNAL: incoherent compilation mode");
	       if (depth === k1List.length) console.error("SIGNAL: incoherent compilation mode");
	       
   	       let to_pre_not_susp = makeOr(astNode, this.name + "_to_pre_not_susp");
	       
   	       for (let i = 0; i <= depth; i++) {
      		  to_pre[i] = makeAnd(astNode, this.name + "_to_pre", i);
      		  this.netList[i].connectTo(to_pre[i], FAN.STD);

		  const j = i === k1List.length ? i - 1 : i;
      		  k1List[j].connectTo(to_pre[i], FAN.STD);
      		  killList[j].connectTo(to_pre[i], FAN.NEG);

      		  if (i === depth) {
		     susp.connectTo(to_pre[i], FAN.NEG);
		  }
		  to_pre[i].connectTo(to_pre_not_susp, FAN.STD);
	       }
	       
   	       let pre_and_susp = makeAnd(astNode, this.name + "_pre_and_susp");
   	       let or_to_pre = makeOr(astNode, this.name + "_or_to_pre");
	       
   	       this.preReg.connectTo(pre_and_susp, FAN.STD);
   	       susp.connectTo(pre_and_susp, FAN.STD);

   	       pre_and_susp.connectTo(or_to_pre, FAN.STD);
   	       to_pre_not_susp.connectTo(or_to_pre, FAN.STD);
   	       or_to_pre.connectTo(this.preReg, FAN.STD);
	    }
	 }
      } else {
   	 // On global signal, there is only one incarnation, and pre
   	 // depends only of this incarnation
   	 let sigNet = makeSig(astNode, this, this.name, prop.accessibility);

   	 this.netList[0] = sigNet;
	 // MS 16jan2025, used to be an OR gate, see above
   	 this.dependency_netList[0] =
	    makeAnd(astNode, this.name + "_dep_global");

	 if (this.preReg) {
   	    sigNet.connectTo(this.preReg, FAN.STD);
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
	 this.values.fill(false);
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
	    this.values[lvl] = this.value;
      	 } else {
	    this.value = value;
	    this.values[lvl] = value;
      	 }
      } else {
       	 if (this.emitted[lvl]) {
	    throw error.TypeError("Can't set single signal `" + this.name
				  + "' value more than once.",
	       loc || this.astNode.loc);  
       	 } else {
	    this.value = value;
	    this.values[lvl] = value;
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
   
   prepare(accessor_list, lvl) {
      accessor_list.forEach(ax => {
	 const sig = ax.signal;
	 const signame = ax.signame;
	 const siglvl = lvl > sig.depth ? sig.astNode.depth : lvl;

         this[signame].signame = ax.signal ? ax.signal.name : ax.signame;
         this[signame].now = sig.netList[siglvl].value;
         this[signame].nowval = sig.value;
         this[signame].pre = lvl >= sig.depth ? sig.preNet?.value : undefined;
         this[signame].preval = lvl >= sig.depth ? sig.pre_value : undefined;
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
      
      this.prepare(state.astNode.accessor_list, state.lvl);
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
      // MS 2feb2024, fix an init bug. Signals input (from JS) at the very
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
function runtimeSignalAccessor(astNode, accessor_list, lvl, dep_target_gate, dep = FAN.DEP) {
   accessor_list.forEach(ax => {
      let gate = null;
      let sig = ax.signal;
      const sigdepth = sig.depth;

      let siglvl = lvl > sigdepth ? sigdepth : lvl;

      if (ax.get_value) {
	 gate = (ax.get_pre
	    ? sig.preNet
	    : sig.dependency_netList[siglvl]);
      } else {
	 gate = (ax.get_pre 
	    ? sig.preNet
	    : sig.netList[siglvl]);
      }

      if (dep_target_gate) {
	 if (!gate) {
	    console.error("*** INTERNAL ERROR: runtimeSignalAccessor, no gate associate",
			  astNode.loc, lvl,
			  accessor_list);
	    throw new TypeError("no gate associated");
	 }

	 //console.error("RSA...gate=", gate.id + "/" + gate.lvl, "dep=", dep_target_gate.id + "/" + dep_target_gate.lvl, "lvl=", lvl, "siglvl=", siglvl);
	 
	 if (gate.lvl <= dep_target_gate.lvl || !ax.get_pre) {
	    gate.connectTo(dep_target_gate, dep);
	 } else {
	    makeOr(astNode, "const.0", lvl).connectTo(dep_target_gate, dep);
	 }
	 // MS 9mar2025 to fix bug-dep-73dc062.hh.js
	 if (lvl === 0 && sig.init_gates[0] && dep_target_gate) {
	    sig.init_gates[0].connectTo(dep_target_gate, FAN.DEP);
	 }
      }
   });
}
