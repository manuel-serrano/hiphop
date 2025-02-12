/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/machine.js                */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Tue Jul 17 08:19:22 2018                          */
/*    Last change :  Tue Feb 11 05:45:07 2025 (serrano)                */
/*    Copyright   :  2018-25 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    HipHop reactive machines                                         */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
import * as compiler from "./compiler.js";
import * as ast from "./ast.js";
import * as net from "./net.js";
import * as signal from "./signal.js";
import { Queue } from "./queue.js";
import * as config from "./config.js";

export { ReactiveMachine };
       
/*---------------------------------------------------------------------*/
/*    commonjs module compatibilty                                     */
/*---------------------------------------------------------------------*/
let debug = false;
let configDebug = config.isServer && (process.env?.HIPHOP_DEBUG ?? true);

/*---------------------------------------------------------------------*/
/*    ReactiveMachine ...                                              */
/*---------------------------------------------------------------------*/
class ReactiveMachine {
   $$name;
   #age;
   sweep;
   tracePropagation;
   dumpNets;
   traceReactDuration;
   traceCompileDuration;
   debug_emitted_func;
   emittedFunc;
   actions;
   needCompile;
   react_in_progress;
   input_signal_map;
   output_signal_map;
   global_signal_map;
   local_signal_list;
   host_event_map;
   exec_status_list;
   nets;
   boot_reg;
   sel;
   k0;
   k1;
   $$queue;
   ast;
   causalityErrorTrace;
   init_values = undefined;
   verbose = 0;
   
   constructor(ast_node, opts={}) {
      if (!(this instanceof ReactiveMachine)) {
	 throw new TypeError("ReactiveMachine not used as a contructor");
      }
      if (!(ast_node instanceof ast.Module)) {
	 throw new TypeError("wrong HipHop module `" + typeof(ast_node) + "'");
      }

      // For compatibilitie with numerous old tests where second argument
      // is a string. Otherwise, the reactive machine must not be named:
      // the name in the debugger came from the main module.
      //
      // TODO: batch: it shouldn't display the reactive machine name
      // (which shouldn't exist anymore), but the name of the main
      // module.
      if (typeof(opts) === "string" || opts instanceof String) {
	 this.$$name = opts;
	 opts = {}
      } else {
	 this.$$name = opts?.name || "";
      }

      // debugging tick
      this.#age = 0;

      // net list optimization
      this.sweep = opts?.sweep ?? config.sweep;
      
      // Display the propagation of gates value
      this.tracePropagation = !!opts?.tracePropagation;
      this.dumpNets = config.isServer && (!!opts?.dumpNets || process.env.HIPHOP_DUMPNETS === "true") ? ReactiveMachine.dumpNets : false;
      // verbosity and debugging
      this.verbose = opts?.verbose ?? 0;

      // true: display on stderr the duration time of each reaction
      this.traceReactDuration = !!opts?.traceReactDuration;

      // true: display on stderr the duration time of compilation
      this.traceCompileDuration = !!opts?.traceCompileDuration;

      // If not null, this is a function which is called with list of
      // emitted signal (and their respectives values) at the end of each
      // reaction.
      //
      // Should only be used for the batch and for debugging.
      this.debug_emitted_func = null;

      // If not null, this function is called with a list of pair
      // { type, nowval } for each output signal which is
      // emitted in the reaction
      this.emittedFunc = null;

      // Mechanism to allow react/input/appendChild/etc. during a
      // reaction (with an atom statement). The action is delayed until
      // the end of the reaction, and atomically applied.
      //
      // Also usefull to trigger actions after initial compilation
      // (e.g. start debugger using opts.debuggerName).
      this.actions = [];

      // Trigger compilation of the machine only when needed.
      this.needCompile = true;

      this.react_in_progress = false;

      this.input_signal_map = {};
      this.output_signal_map = {};
      this.global_signal_map = {};
      this.local_signal_list = [];

      this.host_event_map = {};

      // exec_status struct, see
      // compiler.js:ast.Exec.prototype.make_circuit.
      this.exec_status_list = [];

      this.nets = [];
      this.boot_reg = null;

      // control gates
      this.sel = null;
      this.k0 = null;
      this.k1 = null;

      // queue to handle net propagation during reaction
      // (modified in compile)
      this.$$queue = undefined;

      // to handle causality
      if (opts.causalityErrorTrace === "shallow") {
	  this.causalityErrorTrace = "shallow";
      } else if (opts.causalityErrorTrace === "deep") { 
          this.causalityErrorTrace = "deep";
      } else {
      	 this.causalityErrorTrace = "deep";
      }

      this.ast = ast_node.clone();
      compile(this);

      // hop proxy object containing the last reaction output signals
      for (let k in this.output_signal_map) {
	 const nowval = this.output_signal_map[k].init_func ?
	    this.output_signal_map[k].init_func.call(this) : undefined;
	 if (k in this) {
	    throw `HipHop machine, reserved signal name "${k}"`;
	 } else {
	    this[k] = {
	       signame: k,
	       nowval: nowval,
	       preval: undefined,
	       now: false,
	       pre: false
	    }
	 }
      }

      // Debugger infos :
      //
      // If started, it contains a MachineDebugger object.
      this._debugger = null;
      if (typeof(opts.debuggerName) == "string"
	  || opts.debuggerName instanceof String) {
	 this.debuggerOn(opts.debuggerName);
      }
   }

   // static variables and methods
   static causalityHandler = x => undefined;

   static setCausalityHandler(proc) {
      ReactiveMachine.causalityHandler = proc;
   }
   
   static dumpNets = x => undefined;

   static setDumpNets(proc) {
      ReactiveMachine.dumpNets = proc;
   }

   flushActions() {
      const q = this.actions
      this.actions = [];
      q.forEach(a => a(this));
   }

   action(func) {
      if (this.react_in_progress) {
	 this.actions.push(func);
      } else if (this._debugger && this._debugger.stepper) {
	 this._debugger.stepper_update_queue.push(func);
      } else {
	 return func(this);
      }
   }

   update(state, value, reactp) {
      this.action(_ => {
	 state.value = value;
	 state.active = false;
	 state.prev_active = true;
	 // MS 20jan2025, bug fix, see compiler.js
	 if (state.signal) {
	    state.signal.set_value(value, state.depth);
	 }
      });

      if (reactp) {
	 this.react();
      }
   }

   precompile() {
      this.needCompile = true;
      compile(this);
   }

   promise(ressig = "res", rejsig = "rej") {
      const mach = this;
	       
      return new Promise((res, rej) => {
         	   mach.addEventListener(ressig, e => res(e.nowval));
         	   mach.addEventListener(rejsig, e => rej(e.nowval));
	 	   mach.react();
     		});
   }
	 
   init(...vals) {
      if (this.init_values) {
	 throw new TypeError("machine already initialized");
      } else {
	 this.init_values = vals;
	 this.ast = this.ast.clone();
	 compile(this);
	 const f = ast.findFrameNode(this.ast.children);
	 if (!f) {
	    throw new TypeError((this.$$name ? (this.$$name + ":") : "")
	       + "program accepts no parameters");
	 } else {
	    f.frame.push.apply(f.frame,vals);
	 }
      }
   }

   name() {
      return this.$$name;
   }
      
   age() {
      return this.#age;
   }
   
   react(signals) {
      this.#age++;
      
      if (!this.init_values) {
	 // mark that the machine can nolonger be initialized
	 this.init_values = [];
      }
      
      let d = this._debugger;
      if (d && d.stepper) {
	 d.stepper_pending_reaction++;
	 d.stepper_update();
      }

      if (typeof signals === "string") {
	 this.input(signals, undefined);
      } else {
      	 for (let k in signals) {
	    this.input(k, signals[k]);
      	 }
      }

      return this.action(react);
   }

   input(signal, value=undefined) {

      function signalValue(machine, signal, value) {
	 let signame;
	 let sigobj;

	 if (typeof(signal) === "object") {
	    signame = signal.signame;
	    value = signal.nowval;
	 } else {
	    signame = signal;
	 }

	 sigobj = machine.input_signal_map[signame];

	 if (!sigobj) {
	    throw new ReferenceError(`unbound input signal "${signame}"`);
	 }

	 sigobj.set_value(value, 0);
      }

      // MS (2018/07/31): recompile the machine's program after branch addition
      // see appendChild@ast.js, react@machine.js
      compile(this);

      this.action(machine => {
	 if (signal instanceof Object) {
	    for (let k in signal) {
	       signalValue(machine, k, signal[k]);
	    }
	 } else {
	    signalValue(machine, signal, value);
	 }
      });
   }

   inputAndReact(signal, value = undefined) {
      this.input(signal, value);
      return this.react();
   }
   
   bindEvent(signal, source) {
      source.addEventListener(signal, e => this.react({ [signal]: e.value }));
   }
   
   save() {
      function _save_signals(map_out, map_in) {
	 for (let i in map_out) {
	    map_in[i] = {
	       value: map_out[i].value,
	       pre_value: map_out[i].pre_value
	    };
	 }
      }

      let machine_state = {};

      machine_state.input_signal_map = {};
      machine_state.output_signal_map = {};
      machine_state.global_signal_map = {};
      machine_state.local_signal_list = [];
      machine_state.registers = {};

      this.nets.forEach(n => {
	 if (n instanceof net.RegisterNet) {
	    machine_state.registers[n.stable_id] = n.value;
	 }
      });

      _save_signals(this.input_signal_map, machine_state.input_signal_map);
      _save_signals(this.output_signal_map, machine_state.output_signal_map);
      _save_signals(this.global_signal_map, machine_state.global_signal_map);
      _save_signals(this.local_signal_list, machine_state.local_signal_list);

      return machine_state;
   }

   restore(machine_state) {
      function _restore_signals(map_out, map_in) {
	 for (let i in map_out) {
	    if (!map_in[i]) {
	       throw new Error(`hiphop: machine ${this.$$name}, cannot find signal "${i}"`);
	    }
	    map_in[i].value = map_out[i].value;
	    map_in[i].pre_value = map_out[i].pre_value;
	 }
      }

      _restore_signals(machine_state.input_signal_map, this.input_signal_map);
      _restore_signals(machine_state.output_signal_map, this.output_signal_map);
      _restore_signals(machine_state.global_signal_map, this.global_signal_map);
      _restore_signals(machine_state.local_signal_list, this.local_signal_list);

      this.nets.forEach(n => {
	 if (n instanceof net.RegisterNet) {
	    let value = machine_state.registers[n.stable_id];

	    if (value !== undefined) n.value = value;
	 }
      });
   }

   reset_signals(erase_value=false) {
      function _reset_signals_obj(obj) {
      	 for (let i in obj) {
	    obj[i].reset(erase_value);
      	 }
      }

      function _reset_signals_list(list) {
      	 list.forEach((el, i, list) => list[i].reset(erase_value));
      }

      _reset_signals_obj(this.global_signal_map);
      _reset_signals_list(this.local_signal_list);
   }

   getElementById(id) {
      const loop = (node, id) => {
	 if (node.id === id) {
	    if (!node.machine) node.machine = this;
	    return node;
	 } for (let i = node.children.length - 1; i >= 0; i--) {
	    let el = loop(node.children[i], id);

	    if (el) return el;
	 }
	 return null;
      };

      return loop(this.ast, id);
   }

   addEventListener(signame, callback) {
      if (!this.output_signal_map[signame]) {
      	 throw new ReferenceError("unbound output signal `" + signame + "'");
      }

      if (!(callback instanceof Function))
      	 throw new TypeError("not a function `" + callback + "'", undefined);

      if (!this.host_event_map[signame]) {
      	 this.host_event_map[signame] = [];
      }
      this.host_event_map[signame].push(callback);
   }
   
   removeEventListener(signame, callback = undefined) {
      let callback_list = this.host_event_map[signame];

      if (callback_list) {
	 if (callback) {
	    let i = callback_list.indexOf(callback);

	    if (i > -1) callback_list.splice(i, 1);
	 } else {
	    delete this.host_event_map[signame];
	 }
      }
   }
   
   debuggerOn(name) {
      if (this._debugger)
	 this.debuggerOff();
      
      if (!debug) debug = require("./debugger.js");

      this._debugger = new debug.MachineDebugger(this, name);
   }

   _debuggerUpdate() {
      if (this._debugger)
	 this._debugger.update();
   }

   debuggerOff() {
      if (!this._debugger)
	 return;
      this._debugger.disable();
      this._debugger = null;
   }

   stepperOn() {
      if (this._debugger) {
	 this._debugger.stepper_enable();
      }
   }

   stepperNext(steps=1) {
      if (this._debugger) {
	 this._debugger.stepper_next(steps);
      }
   }

   stepperOff() {
      if (this._debugger) {
	 this._debugger.stepper_disable();
      }
   }

   toJS() {
      try {
	 return toJS(this);
      } catch(e) {
	 console.error(`Cannot compile machine ${this.$$name}`);
	 throw e;
      }
   }

   compileJS() {
      return linkJS(this, eval(this.toJS()));
   }
}

/*---------------------------------------------------------------------*/
/*    react ...                                                        */
/*---------------------------------------------------------------------*/
function react(mach) {
   const profstart = Date.now();

   if (mach.react_in_progress) {
      throw new TypeError("react called during a reaction.");
   }

   compile(mach);

   const profcomp = Date.now();

   mach.react_in_progress = true;
   if (mach.traceReactDuration) {
      console.time("traceReactDuration");
   }

   let nonpropagated_nets = mach.nets.length;
   let known_list = mach.$$queue.reset();

   //
   // Reset proxy for machine.present.S (which can be reseted at the
   // end of the reaction, otherwise they would never be true if the
   // signal is emitted
   //
/*    for (let i in mach.DOMproxiesPresent) {                          */
/*       let p = mach.DOMproxiesPresent[i];                            */
/*       p.value = false;                                              */
/*    }                                                                */

   //
   // Prepare the known list (registers, constants, emitted input
   // signals).
   //
   // Note: see compiler.js:ast.Module.prototype.make_circuit for
   // "SignalNet.accessibility" explanation.
   //
   // Important: it is mandatory that any constant which propagate a
   // value in a register is created *after* the register. That way,
   // registers are (created?) *before* the constant in the machine net list, 
   // and there are added *before* the constant in the known list. Hence,
   // they propagate their value *before* the constant propagate its
   // own in the register. This remark is also true for global input
   // signal, where the signal gate is connected to the register gate:
   // the register gate is created before the signal gate.
   //
   const profpropstart = Date.now();
   
   const RegisterNet = net.RegisterNet;
   const ActionNet = net.ActionNet;
   const LogicalNet = net.LogicalNet;
   const WireNet = net.WireNet;

   mach.nets.forEach((n,i,a) => {
      n.reset(false);
      if (n instanceof RegisterNet) {
	 n.isInKnownList = true;
	 known_list.push(n);
      } else if (n instanceof ActionNet) {
	 if (n.trueFaninCount === 0) {
	    n.isInKnownList = true;
	    n.value = false;
	    known_list.push(n);
	 }
      } else if (n instanceof LogicalNet) {
	 if (((n.accessibility & ast.IN) !== 0) && n.signal?.emitted[n.lvl]) {
	    n.value = true;
	    n.isInKnownList = true;
	    known_list.push(n);
	 } else if (n.faninList.length === 0) {
	    if (n instanceof net.SignalNet) {
	       n.value = false;
	    }
	    n.isInKnownList = true;
	    known_list.push(n);
	 }
      } else if (n instanceof WireNet) {
	 if (n.faninList.length === 0) {
	    n.isInKnownList = true;
	    known_list.push(n);
	 }
      }});
   const nbpush = known_list.length;
   
   for (let i in mach.exec_status_list) {
      let state = mach.exec_status_list[i];
      if (state.prev_active && !state.suspended) {
   	 if (!state.kill) {
   	    state.callback_wire.value = true
   	 }
   	 state.prev_active = false;
      }
   }
   const profiter = Date.now();
   const age = mach.age();

   while (known_list.length > 0) {
      known_list.shift().propagate(known_list, age);
      nonpropagated_nets--;
   }

   const profpropend = Date.now();
   
   if (nonpropagated_nets > 0) {
      ReactiveMachine.causalityHandler(mach);
      throw TypeError(`hiphop: causality error`);
   }

   const debugEnable = (mach.debug_emitted_func instanceof Function);

   const { emitted, emittedDebug } = invokeReactOutputListeners(mach);

   //
   // Trigger execs
   //
   const profexecstart = Date.now();
   
   for (let i in mach.exec_status_list) {
      const state = mach.exec_status_list[i];

      if (state.kill || state.start) {
   	 if (state.kill) {
   	    state.kill = false;
	    state.prev_killed = true;

	    if (state.active && state.func_kill) {
	       state.func_kill.call(state.exec);
	    }

	    state.exec = false;
   	 }

   	 if (state.start) {
   	    state.active = true;
   	    state.start = false;
   	    state.prev_active = false;
   	    state.suspended = false;
   	    state.prev_suspended = false;
	    state.prev_killed = false;
	    state.id = get_exec_id();
	    state.exec = new signal.ExecActionArg(mach, state);
   	    state.func_start.call(state.exec);
	 }
      } else if (state.suspended && !state.prev_suspended) {
   	 state.prev_suspended = true;
   	 if (state.func_susp) state.func_susp.call(state.exec);
      } else if (!state.suspended && state.prev_suspended) {
   	 state.prev_suspended = false;
   	 if (state.func_res) state.func_res.call(state.exec);
      }

   }

   mach._debuggerUpdate();
   mach.reset_signals();
   if (mach.tracePropagation)
      console.error("SEL:" + (mach.sel ? mach.sel.value : false),
		    "K0:" + (mach.k0 ? mach.k0.value : false),
		    "K1:" + (mach.k1 ? mach.k1.value : false));

   if (mach.traceReactDuration) {
      console.timeEnd("traceReactDuration");
   }
   mach.react_in_progress = false;

   if (debugEnable) {
      mach.debug_emitted_func(emittedDebug);
   }

   if (mach.emittedFunc instanceof Function) {
      mach.emittedFunc(emitted);
   }

   mach.flushActions();

   if (mach.profile) {
      const profend = Date.now();
      console.error("reaction time: " + (profend - profstart),
	 "nets: " + nonpropagated_nets,
	 "compile: " + (profcomp - profstart),
	 "propagation: "+ (profpropend - profpropstart),
	 "push: " + nbpush,
	 "exec: " + (profpropend - profexecstart));
      console.error("   [init-time: " + (profiter - profpropstart),
	 "iter-time: " + (profpropend - profiter) + "]");
   }

   const result = {};

   emitted.forEach(e => result[e.signame] = e.nowval);

   return result;
}

/*---------------------------------------------------------------------*/
/*    invokeReactOutputListeners ...                                   */
/*---------------------------------------------------------------------*/
function invokeReactOutputListeners(mach) {
   const debugEnable = (mach.debug_emitted_func instanceof Function);

   let emitted = [];
   let emittedDebug = [];

   for (let i in mach.output_signal_map) {
      let sig = mach.output_signal_map[i];

      if (sig.gate_list[0].value) {
	 let buf = sig.name;
	 const preval = mach[sig.name].nowval;
	 const pre = mach[sig.name].pre;
	 
	 mach[sig.name].preval = mach[sig.name].nowval;
	 mach[sig.name].pre = mach[sig.name].now;
	 mach[sig.name].nowval = sig.value;
	 mach[sig.name].now = true;

         emitted.push({
            signame: sig.name,
            nowval: sig.value,
	    preval: preval,
	    pre: pre
         });

	 if (debugEnable) {
	    if (sig.value !== undefined) {
	       let string_value;

	       try {
		  string_value = JSON.stringify(sig.value);
	       } catch (e) {
		  string_value = sig.value;
	       }
	       buf += "(" + string_value + ")";
	    }
	    emittedDebug.push(buf);
	 }

	 let callback_list = mach.host_event_map[sig.name];
	 if (callback_list) {
	    let stop_propagation = false;
	    let event = {
	       signame: sig.name,
	       nowval: sig.value,
	       preval: preval,
	       stopPropagation: function() {
		  stop_propagation = true;
	       }
	    };

	    for (let i = 0; i < callback_list.length && !stop_propagation; i++)
	       callback_list[i].call(mach, event);
	 }
      } else {
	 mach[sig.name].pre = mach[sig.name].now;
	 mach[sig.name].now = false;
      }
   }

   return { emitted, emittedDebug };
}

/*---------------------------------------------------------------------*/
/*    compile ...                                                      */
/*---------------------------------------------------------------------*/
function compile(mach) {
   if (mach.needCompile) {
      let state = null;

      if (mach.traceCompileDuration) {
	 console.time("traceCompileDuration");
      }

      state = mach.save();

      compiler.compile(mach, mach.ast);

      mach.restore(state);
      mach.needCompile = false;

      if (mach.traceCompileDuration) {
	 console.timeEnd("traceCompileDuration");
      }

      mach.$$queue = new Queue(mach.nets.length);
   }
}

/*---------------------------------------------------------------------*/
/*    linkJS ...                                                       */
/*    -------------------------------------------------------------    */
/*    The first argument is a reactive machine. The second argument    */
/*    is the evaluated result of the compilation of that machine       */
/*    to JS. Typically obtained with "eval(mach.toJS())".              */
/*    -------------------------------------------------------------    */
/*    It is required to separate the compilation of the circuit from   */
/*    the compilation of the ActionNet thunks because the compiled     */
/*    circuit is "evaluated" (to get an executable JS code) in the     */
/*    environment of HipHop implementation, but the ActionNet thunks   */
/*    are defined in the application environment.                      */
/*---------------------------------------------------------------------*/
function linkJS(mach, objfun) {
   const thunks = mach.nets
      .filter(n => n instanceof net.ActionNet)
      .map(n => n.func);
   
   return objfun.apply(undefined, thunks);
}

/*---------------------------------------------------------------------*/
/*    toJS ...                                                         */
/*    -------------------------------------------------------------    */
/*    Returns a JS string that is the result of the compilation        */
/*    of the acyclic circuit of the machine. It is compiled into       */
/*    a JS function that accepts as parameters all the JS thunks       */
/*    of the all ActionNet it contains. The function linkJS, calls     */
/*    this function with all the actual thunk which yield to a         */
/*    "react" function that can be invoked as the genuine mach.react   */
/*    method.                                                          */
/*---------------------------------------------------------------------*/
function toJS(mach) {
   compiler.compile(mach, mach.ast);
   
   let buf = "";
   let nets = mach.nets;
   
   nets.forEach(n => n.faninList_mirror = n.faninList);

   // get the list of actions (thunks of ActionNet nodes)
   const args = nets.filter(n => n instanceof net.ActionNet)
      .map(n => n.toJSAction())
      .join(", ");

   buf += (`(${args}) => {\n\n`)

   // invokeListeners
   buf += "   const invokeListeners = (mach, signame) => {\n";
   buf += "      const sig = mach.global_signal_map[signame];\n";
   buf += "      const preval = mach[signame].nowval;\n";
   buf += "      const callbacks = mach.host_event_map[signame];\n\n";
   buf += "      mach[signame].preval = mach[signame].nowval;\n";
   buf += "      mach[signame].pre = mach[signame].now;\n";
   buf += "      mach[signame].nowval = sig.value;\n";
   buf += "      mach[signame].now = true;\n\n";
   buf += "      if (callbacks) {\n";
   buf += "         let stop_propagation = false;\n";
   buf += "         let event = { signame, nowval: sig.value, preval, stopPropagation: () => { stop_propagation = true; } };\n";
   buf += "         for (let i = 0; i < callbacks.length && !stop_propagation; i++) callbacks[i].call(mach, event);\n";
   buf += "      } else {\n";
   buf += "         mach[sigame].pre = mach[signame].now;\n";
   buf += "         mach[sigame].now = false;\n";
   buf += "      }\n";
   buf += "   }\n\n";

   // fillThisArg
   buf += "   const fillThisArg = (arg, signame, now, pre) => {\n";
   buf += "      const sig = this.global_signal_map[signame];\n";
   buf += "      const argf = arg[signame];\n";
   buf += "      argf.nowval = sig.value;\n";
   buf += "      argf.preval = sig.pre_value;\n";
   buf += "      argf.now = now;\n";
   buf += "      argf.pre = pre;\n";
   buf += "   }\n\n";
   
   // pre-allocate all the ActionNet arguments
   nets.filter(n => n instanceof net.ActionNet)
      .forEach(n => {
	 const arr = `new Array(${n.lvl + 1}).fill(undefined)\n      `;
	 const sigs = n.accessor_list
	    .map(a => `["${a.signal.name}"]: { signame: "${a.signal.name}", nowval: undefined, preval: undefined, now: undefined, pre: undefined }`)
	    .join(", ");
	 buf += `   const ${n.toJSArg()} = ${arr}.map(_ => { return { ${sigs} }; });\n`;
      });
   buf += "\n";

   // declare the net registers
   buf += ("   let " +
      nets.filter(n => n instanceof net.RegisterNet)
	 .map(n => `${n.toJSReg()} = ${n.value}`)
	 .join(", ") + ";");
   buf += "\n\n";

   // object function (to be evaluated+linked), see linkJS
   buf += ("   const react = function(signals = {}) {\n\n");

   // declare gate registers of sweeped input signal gates
   for (let k in mach.input_signal_map) {
      const s = mach.input_signal_map[k];
      const g = s.gate_list[0];

      if (g.sweeped) {
	 buf += `      const ${s.gate_list[0].toJSVar()} = ("${k}" in signals);\n`;
      }
   }

   // declare gate registers
   buf += ("      let " + nets.map(n => n.toJSDecl()).join(", ") + ";\n\n");

   
   buf += "      for (let k in signals) this.input(k, signals[k]);\n"
   buf += "      this.react_in_progress = false;\n\n";

   while (nets.length > 0) {
      const l = nets.length;

      nets = nets.filter(n => {
	 if (n.faninList_mirror.every(f => f.net instanceof net.RegisterNet)) {
	    // true is faninList_mirror is empty
	    buf += (`      // ${n.id} ${n.debug_name}\n`);
	    buf += (`      // ${n.ast_node.loc.filename}:${n.ast_node.loc.pos}\n`);
	    buf += ("      " + n.toJS() + ";\n");
	    
	    n.fanoutList.forEach(f => {
	       f.net.faninList_mirror =
		  f.net.faninList_mirror.filter(g => g !== f.antagonist);
	    });
	    return false;
	 } else {
	    return true;
	 }
      });
      
      if (nets.length === l) {
	 throw new Error("error, cannot generate JS code: "
	    + nets.map(n => n.id).join(","));
      }
   }

   // output listeners
   buf += "\n";
   for (let k in mach.output_signal_map) {
      const s = mach.output_signal_map[k];
      const g = s.gate_list[0];
      buf += `      if (${g.toJSVar()}) { invokeListeners(this, "${s.name}") }\n`;
   }
   
   buf += "\n";
   buf += "      this.reset_signals();\n";
   buf += "      this.react_in_progress = false;\n";

   buf += ("   };\n");
   buf += ("   return react;\n");
   buf += ("}");

   return buf;
}
   
/*---------------------------------------------------------------------*/
/*    pretty_print ...                                                 */
/*---------------------------------------------------------------------*/
ReactiveMachine.prototype.pretty_print = function() {
   //
   // If pretty_print after add/remove parallel branch, but before react.
   //
   compile(this);

   if (!debug) debug = require("./debugger.js");
   
   let wd_list = debug.make_wd_list(this.ast);
   let buf = "";

   wd_list.forEach(function(wd, idx, arr) {
      buf += "\nMODULE" + idx;
      wd.instruction_list.forEach(function(instr, idx, arr) {
	 buf += "\n";
	 for (let i = 0; i < (3 * instr.indent); i++)
	    buf += " ";
	 instr.word_list.forEach(function(word, idx, arr) {
	    buf += word.body + " ";
	 });
      });
      buf += "\n\n";
   });
   return buf;
}

ReactiveMachine.prototype.stats = function() {
   return this.nets.reduce((stats, net_) => {
      if (net_ instanceof net.RegisterNet) {
	 stats.registers++;
      } else if (net_ instanceof net.ActionNet) {
	 stats.actions++;
      } else if (!net_.faninList.length) {
	 stats.constants++;
      } else if (net_.faninList.length == 1) {
	 stats.buffers++;
      } else {
	 stats.logicals++;
      }

      return stats;
   }, {
      gates: this.nets.length,
      constants: 0,
      buffers: 0,
      registers: 0,
      logicals: 0,
      actions: 0
   })
}

const get_exec_id = (function() {
   let id = 1;

   return function() {
      return ++id;
   }
})();
