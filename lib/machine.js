/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/machine.js                */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Tue Jul 17 08:19:22 2018                          */
/*    Last change :  Sun Dec 14 06:34:59 2025 (serrano)                */
/*    Copyright   :  2018-25 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    HipHop reactive machines                                         */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
import * as config from "./config.js";
import * as ast from "./ast.js";
import * as net from "./net.js";
import * as signal from "./signal.js";
import * as compiler from "./compiler.js";
import { Queue } from "./queue.js";
import * as native from "./native.js";
import { readFileSync } from "node:fs";

export { ReactiveMachine }
       
/*---------------------------------------------------------------------*/
/*    commonjs module compatibilty                                     */
/*---------------------------------------------------------------------*/
let debug = false;
/* let configDebug = config.isServer && (process.env?.HIPHOP_DEBUG ?? true); */

/*---------------------------------------------------------------------*/
/*    Default machine configuration                                    */
/*---------------------------------------------------------------------*/
function conf(key, def) {
   switch (config.Process.env[key]) {
      case "true": return true;
      case "false": return false;
      case "undefined": return undefined;
      default: return def;
   }
}

export const Compiler = config.Process.env?.HIPHOP_COMPILER ?? "new";
export const Native = conf("HIPHOP_NATIVE", undefined);
export let Sweep = conf("HIPHOP_SWEEP", true);
export const Sigpre = conf("HIPHOP_SIGPRE", true);
export const Unreachable = conf("HIPHOP_UNREACHABLE", true);
export const LoopSafe = conf("HIPHOP_LOOPSAFE", true);
export const ForkOrKill = conf("HIPHOP_FORKORKILL", false);
export const LoopUnroll = conf("HIPHOP_LOOPUNROLL", undefined);
export const LoopDup = conf("HIPHOP_LOOPDUP", undefined);
export const Reincarnation = conf("HIPHOP_REINCARNATION", undefined);

export function setSweep(v) {
   Sweep = v;
}

/*---------------------------------------------------------------------*/
/*    dumpNets                                                         */
/*---------------------------------------------------------------------*/
const DumpNets = process.env.HIPHOP_TRACE
   && process.env.HIPHOP_TRACE.split(",").find(n => n === "nets");

/*---------------------------------------------------------------------*/
/*    ReactiveMachine ...                                              */
/*---------------------------------------------------------------------*/
class ReactiveMachine {
   $$name;
   #age;
   opts;
   status = { sweep: {}, native: {} };
   sweep;       // enable sweep optimization
   unreachable; // unreachable optimization
   sigpre;      // enable sig pre axs optimization
   dynamic;     // enable dynamic program modification
   compiler;    // default compiler ("orig", "int", "new")
   tracePropagation;
   dumpNets;
   traceReactDuration;
   traceCompileDuration;
   debug_emitted_func;
   emittedFunc;
   actions;
   needCompile;
   react_in_progress;
   signals;
   signalsById;
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
   verbose = 1;
   loopUnroll = false;
   loopDup = false;
   loopSafe = false;
   forceClone = true;
   #nativeReact = undefined;
   #nativeInputs = {};
   
   constructor(ast_node, opts={}) {
      if (!(this instanceof ReactiveMachine)) {
	 throw new TypeError("ReactiveMachine not used as a contructor");
      }
      if (!(ast_node instanceof ast.Module)) {
	 throw new TypeError("wrong HipHop module `" + typeof(ast_node) + "'");
      }

      this.opts = opts;
      
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
      this.#age = -1;

      // program dynamic modifications
      this.dynamic = opts?.dynamic ?? false;
      
      // net list optimizations
      this.sweep = opts?.sweep ?? (this.dynamic ? false: Sweep);
      this.sigpre = opts?.sigpre ?? Sigpre;
      this.unreachable = opts.unreachable ?? Unreachable;

      if (this.dynamic && this.sweep) {
	 throw new Error("HipHop, cannot use both dynamic and sweep: " + opts);
      }
      
      // default machine compiler
      this.compiler = opts?.compiler ?? Compiler;
      this.native = opts?.native ?? (this.dynamic ? false : Native);

      // unroll loops
      this.loopUnroll = opts?.loopUnroll ?? (LoopUnroll === undefined ? (this.compiler === "new") : LoopUnroll);

      // reincarnation
      this.reincarnation = opts?.reincarnation ?? (Reincarnation === undefined ? (this.compiler === "int") : Reincarnation);
      
      // loop duplication
      this.loopDup = opts.loopDup ?? LoopDup;
      
      // loop safe
      this.loopSafe = opts?.loopSafe ?? LoopSafe;

      // forkOrKill (see compiler.js)
      this.forkOrKill = opts?.forkOrKill ?? ForkOrKill;
      
      // Display the propagation of gates value
      this.tracePropagation = !!opts?.tracePropagation;
      this.dumpNets = config.isServer && (!!opts?.dumpNets || DumpNets) ? ReactiveMachine.dumpNets : false;
      // verbosity and debugging
      this.verbose = ("verbose" in opts) ? opts.verbose : 1;

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

      // If not null, this function is called with a list of pair
      // { type, nowval } for every signal emitted in the reaction
      this.allEmittedFunc = null;

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

      this.signals = {};
      this.signalsById = {};
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

      if (!("cloneAst" in opts) || opts.cloneAst) {
	 this.ast = ast_node.clone();
      } else {
	 this.ast = ast_node;
      }
      
      this.compile();

      // native code compilation
      if (this.native !== false) {
	 if (this.dynamic) {
	    throw new TypeError("HipHop, cannot use both dynamic and native");
	 } else {
	    try {
	       const compstart = Date.now();
	       this.#nativeReact = this.compileNative();
	       this.#nativeInputs = {};
	       this.status.native = { status: "success", time: Date.now() - compstart};
	    } catch (e) {
	       if (e.cyclic) {
		  this.status.native = { status: "failure", error: e };
		  if (this.native === true) {
		     throw new TypeError("Native compilation: cyclic program");
		  }
	       } else {
		  throw e;
	       }
	    }
	 }
      }

      // hop proxy object containing the last reaction output signals
      for (let k in this.output_signal_map) {
	 const nowval = this.output_signal_map[k].init_func ?
	    this.output_signal_map[k].init_func.call(this.signals) : undefined;
	 this.signals[k] = {
	    signame: k,
	    nowval: nowval,
	    preval: undefined,
	    now: false,
	    pre: false
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
      this.compile();
   }

   compile() {
      if (this.needCompile) {
	 let state = null;

	 if (this.traceCompileDuration) {
	    console.time("traceCompileDuration");
	 }

	 state = this.save();

	 compiler.compile(this, this.ast);

	 this.restore(state);
	 this.needCompile = false;

	 if (this.traceCompileDuration) {
	    console.timeEnd("traceCompileDuration");
	 }

	 this.$$queue = new Queue(this.nets.length);
      }
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
	 this.compile();
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

      if (this.#nativeReact) {
	 const nativeInputs = this.#nativeInputs;
	 this.#nativeInputs = {};

	 // update nowNativeInputs
	 if (signals) {
	    if (typeof signals === "string") {
	       nativeInputs[signals] = undefined;
	    } else {
	       Object.assign(nativeInputs, signals);
	    }
	 }

	 if (this.react_in_progress) {
	    this.actions.push(() => this.#nativeReact(nativeInputs));
	 } else {
	    return this.#nativeReact(nativeInputs);
	 }
      } else {
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
   }

   reactDebug(signals) {
      const old = this.allEmittedFunc;
      let evt = Object.assign({}, signals);
      this.allEmittedFunc = e => Object.assign(evt, e);
      try {
	 this.react(signals);
      } finally {
	 this.allEmittedFunc = old;
      }
      return evt;
   }

   setInputSignal(signame, value) {
      const sigobj = this.input_signal_map[signame];

      if (!sigobj) {
	 throw new ReferenceError(`unbound input signal "${signame}"`);
      }

      sigobj.set_value(value, 0);
   }
      
   input(signal, value = undefined) {
      if (this.#nativeReact) {
	 // accumulates the inputs for nativeReact
	 if (signal instanceof Object) {
	    for (let k in signal) {
	       this.#nativeInputs[k] = signal[k];
	    }
	 } else {	    
	    this.#nativeInputs[signal] = value;
	 }
      } else {
      // MS (2018/07/31): recompile the machine's program after branch addition
      // see appendChild@ast.js, react@machine.js
      this.compile();

	 this.action(machine => {
	    if (signal instanceof Object) {
	       for (let k in signal) {
		  machine.setInputSignal(k, signal[k]);
	       }
	    } else {
	       machine.setInputSignal(signal, value);
	    }
	 });
      }
   }

   inputAndReact(signal, value = undefined) {
      console.error('Method "inputAndReact" deprecated, use "react" instead');
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

      if (this.#nativeReact) {
	 throw new Error('save: incompatible compilation add "{ dynamic: true }" to the machine.');
      }

      let machine_state = {};

      machine_state.input_signal_map = {};
      machine_state.output_signal_map = {};
      machine_state.global_signal_map = {};
      machine_state.local_signal_list = [];
      machine_state.registers = {};

      this.nets.forEach(n => {
	 if (n instanceof net.RegisterNet) {
	    machine_state.registers[n.stable_id] = n.nextValue;
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

      if (this.#nativeReact) {
	 throw new Error('restore: incompatible compilation add "{ dynamic: true }" to the machine.');
      }

      _restore_signals(machine_state.input_signal_map, this.input_signal_map);
      _restore_signals(machine_state.output_signal_map, this.output_signal_map);
      _restore_signals(machine_state.global_signal_map, this.global_signal_map);
      _restore_signals(machine_state.local_signal_list, this.local_signal_list);

      this.nets.forEach(n => {
	 if (n instanceof net.RegisterNet) {
	    let value = machine_state.registers[n.stable_id];

	    if (value !== undefined) n.nextValue = value;
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

   reset_execs() {
      for (let i in this.exec_status_list) {
	 let state = this.exec_status_list[i];
	 if (state.prev_active && !state.suspended) {
   	    if (!state.kill) {
   	       state.callback_wire.value = true;
   	    }
   	    state.prev_active = false;
	 }
      }      
   }

   trigger_execs() {
      for (let i in this.exec_status_list) {
	 const state = this.exec_status_list[i];

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
	       state.exec = new signal.ExecActionArg(this, state);
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

   compileNative() {
      const js = native.compile(this);

      if (config.Process.env.HIPHOP_DEBUG_NATIVE) {
	 console.error(js);
      }
      
      return native.link(this, eval(js));
   }
}

/*---------------------------------------------------------------------*/
/*    react ...                                                        */
/*---------------------------------------------------------------------*/
function react(mach) {
   const age = mach.age();
   const profstart = Date.now();

   if (mach.react_in_progress) {
      throw new TypeError("react called during a reaction.");
   }

   mach.compile();

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

   if (mach.tracePropagation || net.DEBUG_PROPAGATE) {
      console.error(`[${age}] ===============================================`);
   }

   mach.nets.forEach((n,i,a) => {
      n.reset(false);
      if (n instanceof RegisterNet) {
	 if (mach.tracePropagation || net.DEBUG_PROPAGATE) {
	    console.error(`[${age}] push register ${n.id} this.v=${n.value}`);
	 }
	 n.isInKnownList = true;
	 known_list.push(n.trace(age));
      } else if (n instanceof ActionNet) {
	 if (n.trueFaninCount === 0 && n.dependencyCount === 0) {
	    n.isInKnownList = true;
	    n.value = false;
	    known_list.push(n.trace(age));

	    if (n.neutral) {
	       n.action();
	       n.evaluated = true;
	    }
	 }
      } else if (n instanceof LogicalNet) {
	 if (((n.accessibility & ast.IN) !== 0) && n.signal?.emitted[n.lvl]) {
	    if (mach.tracePropagation || net.DEBUG_PROPAGATE) {
	       console.error(`[${age}] push signal ${n.id}`);
	    }
	    n.value = true;
	    n.isInKnownList = true;
	    known_list.push(n.trace(age));
	 } else if (n.faninList.length === 0) {
	    if (mach.tracePropagation || net.DEBUG_PROPAGATE) {
	       console.error(`[${age}] push constant ${n.id}`);
	    }
	    if (n instanceof net.SignalNet) {
	       n.value = false;
	    }
	    n.isInKnownList = true;
	    known_list.push(n.trace(age));
	 }
      } else if (n instanceof WireNet) {
	 if (mach.tracePropagation || net.DEBUG_PROPAGATE) {
	    console.error(`[${age}] push wire ${n.id}`);
	 }
	 if (n.faninList.length === 0) {
	    n.isInKnownList = true;
	    known_list.push(n.trace(age));
	 }
      }});
   const nbpush = known_list.length;

   if (mach.tracePropagation || net.DEBUG_PROPAGATE) {
      console.error(`[${age}] -----------------------------------------------`);
   }

   // Reset execs
   mach.reset_execs();
   
   const profiter = Date.now();

   while (known_list.length > 0) {
      known_list.shift().propagate(known_list, age);
      nonpropagated_nets--;
   }
   const profpropend = Date.now();
   
   if (nonpropagated_nets > 0) {
      try {
	 ReactiveMachine.causalityHandler(mach);
	 throw TypeError("hiphop: causality error", mach.nets.find(n => !n.isInKnownList).astNode.loc);
      } finally {
         if (mach.dumpNets) {
	    mach.dumpNets(mach, false, ".nets!.json");
	 }
      }
   }

   if (mach.allEmittedFunc instanceof Function) {
      const emitted = {};

      for (let i in mach.output_signal_map) {
	 let sig = mach.output_signal_map[i];

	 if (sig.gate_list[0].value) {
	    emitted[sig.name]= sig.value;
	 }
      }

      for (let i in mach.input_signal_map) {
	 let sig = mach.input_signal_map[i];
	 
	 if (sig.gate_list[0].value) {
	    emitted[sig.name]= sig.value;
	 }
      }
      for (let i in mach.local_signal_list) {
	 let sig = mach.local_signal_list[i];
	 const j = sig.emitted.findLastIndex(x => x);

	 if (j >= 0) {
	    emitted[sig.name] = sig.values[j];
	 }
      }
      
      mach.allEmittedFunc(emitted);
   }

   const { emitted, emittedDebug } = invokeReactOutputListeners(mach);

   // Trigger execs
   const profexecstart = Date.now();

   mach.trigger_execs();
   
   
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

   if (mach.debug_emitted_func instanceof Function) {
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
	 const preval = mach.signals[sig.name].nowval;
	 const pre = mach.signals[sig.name].pre;
	 
	 mach.signals[sig.name].preval = mach.signals[sig.name].nowval;
	 mach.signals[sig.name].pre = mach.signals[sig.name].now;
	 mach.signals[sig.name].nowval = sig.value;
	 mach.signals[sig.name].now = true;

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
	 mach.signals[sig.name].pre = mach.signals[sig.name].now;
	 mach.signals[sig.name].now = false;
      }
   }

   return { emitted, emittedDebug };
}

/*---------------------------------------------------------------------*/
/*    pretty_print ...                                                 */
/*---------------------------------------------------------------------*/
ReactiveMachine.prototype.pretty_print = function() {
   //
   // If pretty_print after add/remove parallel branch, but before react.
   //
   this.compile();

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
