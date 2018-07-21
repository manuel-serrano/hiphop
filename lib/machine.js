/*=====================================================================*/
/*    serrano/prgm/project/hiphop/0.2.x/lib/machine.js                 */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Tue Jul 17 08:19:22 2018                          */
/*    Last change :  Sat Jul 21 08:28:36 2018 (serrano)                */
/*    Copyright   :  2018 Manuel Serrano                               */
/*    -------------------------------------------------------------    */
/*    HipHop reactive machines                                         */
/*=====================================================================*/
"use strict"
"use hopscript"

const hh = require("./hiphop.js");
const compiler = require("./compiler.js");
const error = require("./error.js");
const ast = require("./ast.js");
const net = require("./net.js");
const signal = require("./signal.js");
const lang = require("./lang.js");
const debug = require("./debugger.js");

function ReactiveMachine(ast_node, opts={}) {
   if (!(ast_node instanceof ast.Module))
      throw new error.TypeError("Module", typeof(ast_node),
				"machine name: " + name);

   //
   // For compatibilitie with numerous old tests where second argument
   // is a string. Otherwise, the reactive machine must not be named:
   // the name in the debugger came from the main module.
   //
   // TODO: batch: it shouldn't display the reactive machine name
   // (which shouldn't exist anymore), but the name of the main
   // module.
   //
   if (typeof(opts) == "string" || opts instanceof String) {
      this.name = opts;
      opts = {}
   } else {
     this.name = opts.name;
   }

   //
   // Sweep by default
   //
   this.sweep = opts.sweep === undefined ? true : !!opts.sweep;

   //
   // Display the propagation of gates value
   //
   this.tracePropagation = !!opts.tracePropagation;

   //
   // true: display on stderr the duration time of each reaction
   //
   this.traceReactDuration = !!opts.traceReactDuration;

   //
   // true: display on stderr the duration time of compilation
   //
   this.traceCompileDuration = !!opts.traceCompileDuration;

   //
   // If not null, this is a function which is called with list of
   // emitted signal (and their respectives values) at the end of each
   // reaction.
   //
   // Should only be used for the batch and for debugging.
   //
   this.debug_emitted_func = null;

   //
   // If not null, this function is called with a list of pair {
   // signalName, signalValue } for each output signal which is
   // emitted in the reaction
   //
   this.emittedFunc = null;

   //
   // Mechanism to allow react/input/appendChild/etc. during a
   // reaction (with an atom statement). The action is delayed until
   // the end of the reaction, and atomically applied.
   //
   // Also usefull to trigger actions after initial compilation
   // (e.g. start debugger using opts.debuggerName).
   //
   this.atomic_queue = [];

   //
   // Compilation context. Freed when compilation over. See
   // compiler.js.
   //
   this.cc_local_signal_stack = null;

   //
   // Trigger compilation of the machine only when needed.
   //
   this.lazy_compile = false;

   this.react_in_progress = false;

   this.input_signal_map = {};
   this.output_signal_map = {};
   this.global_signal_map = {};
   this.local_signal_list = [];

   this.host_event_map = {};

   //
   // Proxies are not saved/restored, since there are automatically
   // rebuild by the DOM.
   //
   this.DOMproxiesValue = {};
   this.DOMproxiesPresent = {};

   //
   // exec_status struct, see
   // compiler.js:ast.Exec.prototype.make_circuit.
   //
   this.exec_status_list = [];

   this.nets = [];
   this.boot_reg = null;

   //
   // control gates
   //
   this.sel = null;
   this.k0 = null;
   this.k1 = null;

   this.ast = ast_node.clone();
   this.compile();

   //
   // Generate the API for input/output signals (proxies, promises,
   // etc.)
   //
   this.promise = {};
   this.value = {};
   this.present = {};
   makeSignalAPI(this);

   //
   // Debugger infos :
   //
   // If started, it contains a MachineDebugger object.
   //
   this._debugger = null;
   if (typeof(opts.debuggerName) == "string"
       || opts.debuggerName instanceof String) {
      this.debuggerOn(opts.debuggerName);
   }
}

exports.ReactiveMachine = ReactiveMachine;

ReactiveMachine.prototype.compile = function() {
   let state = null;

   if (this.traceCompileDuration) {
      console.time("traceCompileDuration");
   }

   if (this.lazy_compile) {
      state = this.save();
   }

   compiler.compile(this, this.ast);

   if (this.lazy_compile) {
      this.restore(state);
      this.lazy_compile = false;
   }

   if (this.traceCompileDuration) {
      console.timeEnd("traceCompileDuration");
   }
}

ReactiveMachine.prototype.debuggerOn = function(name) {
   if (this._debugger)
      this.debuggerOff();

   this._debugger = new debug.MachineDebugger(this, name);
}

ReactiveMachine.prototype._debuggerUpdate = function() {
   if (this._debugger)
      this._debugger.update();
}

ReactiveMachine.prototype.debuggerOff = function() {
   if (!this._debugger)
      return;
   this._debugger.disable();
   this._debugger = null;
}

ReactiveMachine.prototype.stepperOn = function() {
   if (this._debugger) {
      this._debugger.stepper_enable();
   }
}

ReactiveMachine.prototype.stepperNext = function(steps=1) {
   if (this._debugger) {
      this._debugger.stepper_next(steps);
   }
}

ReactiveMachine.prototype.stepperOff = function() {
   if (this._debugger) {
      this._debugger.stepper_disable();
   }
}

ReactiveMachine.prototype.react = function() {
   let d = this._debugger;
   if (d && d.stepper) {
      d.stepper_pending_reaction++;
      d.stepper_update();
   }
   this.update(() => this._react());
}

ReactiveMachine.prototype._react = function() {
   if (this.react_in_progress) {
      throw new error.InternalError("_react called during a reaction.");
   }

   if (this.lazy_compile)
      this.compile();

   this.react_in_progress = true;
   if (this.traceReactDuration) {
      console.time("traceReactDuration");
   }

   let nonpropagated_nets = this.nets.length;
   let known_list = [];

   let emitted = [];
   let emittedDebug = [];

   //
   // Reset proxy for machine.present.S (which can be reseted at the
   // end of the reaction, otherwise they would never be true if the
   // signal is emitted
   //
   for (let i in this.DOMproxiesPresent) {
      let p = this.DOMproxiesPresent[i];
      p.value = false;
   }

   //
   // Prepare the known list (registers, constants, emitted input
   // signals).
   //
   // Note: see compiler.js:ast.Module.prototype.make_circuit for
   // isGlobalInputSignalNet explanation.
   //
   // Important: it is mandatory that any constant which propagate a
   // value in a register are created *after* the register. That way,
   // registers are *before* the constant in the machine net list, and
   // there are added *before* the constant in the known list. Hence,
   // they propagate their value *before* the constant propagate its
   // own in the register. This remark is also true for global input
   // signal, where the signal gate is connected to the register gate:
   // the register gate is created before the signal gate.
   //
   this.nets.forEach(net_ => {
      net_.reset(false);
      if (net_ instanceof net.RegisterNet) {
	 known_list.push(net_);
      } else if (net_ instanceof net.LogicalNet) {
	 if (net_.isGlobalInputSignalNet && net_.signal.emitted) {
	    net_.value = true;
	    known_list.push(net_);
	 } else if (net_.fanin_list.length == 0) {
	    known_list.push(net_);
	 }
      }
   });

   for (let i in this.exec_status_list) {
      let state = this.exec_status_list[i];
      if (state.prev_active && !state.suspended) {
   	 if (!state.kill) {
   	    state.callback_wire.value = true
   	 }
   	 state.prev_active = false;
      }
   }

   while (known_list.length > 0) {
      known_list.shift().propagate(known_list);
      nonpropagated_nets--;
   }

   if (nonpropagated_nets > 0) {
      let listing = () => {
	 for (let i in this.nets) {
	    if (!this.nets[i].hasBeenPropagated() &&
		this.nets[i].fanin_list.length > 0) {
	       //let loc = this.nets[i].ast_node.loc.split(":")[1];
	       let loc = this.nets[i].ast_node.loc.pos;
	       let buf = "!!! " + this.nets[i].debug_name + " " + loc;

	       this.nets[i].fanin_list.forEach(function(fin) {
		  if (fin.net.hasBeenPropagated())
		     return;
		  //let loc = fin.net.ast_node.loc.split(":")[1];
		  let loc = fin.net.ast_node.loc.pos;
		  buf += "\n    " + fin.net.debug_name + " " + loc;
	       });

	       console.log(buf);
	    }
	 }
      }

      throw new error.CausalityError(nonpropagated_nets, listing);
   }

   for (let i in this.output_signal_map) {
      let sig = this.output_signal_map[i];

      if (sig.gate_list[0].value) {
	 let buf = sig.name;

         emitted.push({
            signalName: sig.name,
            signalValue: sig.value
         });
         
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
	 let callback_list = this.host_event_map[sig.name];
	 if (callback_list) {
	    let stop_propagation = false;
	    let event = { signalName: sig.name,
			  signalValue: sig.value,
			  stopPropagation: function() {
			     stop_propagation = true;
			  }
			};

	    for (let i = 0; i < callback_list.length && !stop_propagation; i++)
	       callback_list[i].call(null, event);
	 }
      }
   }

   //
   // Trigger execs
   //
   for (let i in this.exec_status_list) {
      let state = this.exec_status_list[i];
      let get_exec_handler_receiver = (newPayload) => {
	 let self = {}
	 self.id = state.id;
	 self.machine = this;
	 self.notify = function(value=undefined) {
	    if (state.id == self.id) {
	       let machine = state.ast_node.machine;
	       machine.update(() => {
		  state.value = value;
		  state.active = false;
		  state.prev_active = true;
	       });
	       return true;
	    }
	    return false;
	 }
	 self.notifyAndReact = function(value=undefined) {
	    if (self.notify(value)) {
	       state.ast_node.machine.react();
	    }
	 }

	 //
	 // Since no consensus has been found yet for exec termination
	 // name, several can be used for now...
	 //
	 self.terminateExec = self.notify;
	 self.terminateExecAndReact = self.notifyAndReact;
	 self.complete = self.notify;
	 self.completeAndReact = self.notifyAndReact;

	 Object.defineProperty(self, "id", { writable: false });

	 //
	 // TODO: use Obhect.assign when it will works in Hop.js
	 //
	 let vals = signal.generate_this(state.ast_node.machine,
					 state.ast_node.accessor_list,
					 state.lvl);
	 self.value = vals.value,
	 self.preValue = vals.preValue,
	 self.present = vals.present,
	 self.prePresent = vals.prePresent

	 //
	 // payload objet allows to add properties in EXEC handlers
	 // that can be uses in other handlers of the same EXEC
	 // instance.
	 //
	 // THIS -> this.payload
	 // THIS.something -> this.payload.something
	 //
	 if (newPayload) {
	    state.payload = {
	       get killed() {
		  return state.kill || state.prev_killed;
	       },
	       get id() {
		  return state.id;
	       }
	    }
	 }
	 self.payload = state.payload;
	 return self;
      }

      if (state.kill || state.start) {
   	 if (state.kill) {
   	    state.kill = false;
	    state.prev_killed = true;

	    if (state.func_kill) {
   	       state.func_kill.apply(get_exec_handler_receiver());
	    }
   	 }

   	 if (state.start) {
   	    state.active = true;
   	    state.start = false;
   	    state.prev_active = false;
   	    state.suspended = false;
   	    state.prev_suspended = false;
	    state.prev_killed = false;
	    state.id = get_exec_id();
   	    state.func_start.apply(get_exec_handler_receiver(true));
	 }
      } else if (state.suspended && !state.prev_suspended) {
   	 state.prev_suspended = true;
   	 if (state.func_susp)
   	    state.func_susp.apply(get_exec_handler_receiver());
      } else if (!state.suspended && state.prev_suspended) {
   	 state.prev_suspended = false;
   	 if (state.func_res)
   	    state.func_res.apply(get_exec_handler_receiver());
      }

   }

   this._debuggerUpdate();
   this.reset_signals();
   if (this.tracePropagation)
      console.error("SEL:" + (this.sel ? this.sel.value : false),
		    "K0:" + (this.k0 ? this.k0.value : false),
		    "K1:" + (this.k1 ? this.k1.value : false));

   if (this.traceReactDuration) {
      console.timeEnd("traceReactDuration");
   }
   this.react_in_progress = false;

   if (this.debug_emitted_func instanceof Function)
      this.debug_emitted_func(emittedDebug);

   if (this.emittedFunc instanceof Function) {
      this.emittedFunc(emitted);
   }

   let pending;
   while (pending = this.atomic_queue.shift()) {
      pending();
   }

   //
   // Tells the debugger that a reaction just happend
   //
   return true;
}

ReactiveMachine.prototype.update = function(func) {
   if (this.react_in_progress) {
      this.atomic_queue.push(func);
   } else if (this._debugger && this._debugger.stepper) {
      this._debugger.stepper_update_queue.push(func);
   } else {
      func();
   }
}

/*---------------------------------------------------------------------*/
/*    input ...                                                        */
/*---------------------------------------------------------------------*/
ReactiveMachine.prototype.input =
   function( signal, value=undefined ) {
      let signame;
      let sigobj;
      
      this.update( () => {
	 if( typeof( signal ) == "object" ) {
	    signame = signal.signalName;
	    value = signal.signalValue;
	 } else {
	    signame = signal;
	 }

	 sigobj = this.input_signal_map[ signame ];

	 if( !sigobj ) {
	    throw new ReferenceError( "unbound input signal `" + signame + "'" );
	 }

	 sigobj.set_value( value );
      } );
   }

/*---------------------------------------------------------------------*/
/*    intputAndReact ...                                               */
/*---------------------------------------------------------------------*/
ReactiveMachine.prototype.inputAndReact =
   function( signal, value = undefined ) {
      this.input( signal, value );
      return this.react();
   }

ReactiveMachine.prototype.batch_reset = function() {
   if (this.sweep) {
      //
      // Reactive machine reset makes a fresh reactive machine without
      // recompiling the crcuit. Hence, register which has value
      // `true` because of constant propagation will become false,
      // which is an error.
      //
      // Since reactive machine reset is only used in batch, we just
      // forbid it if sweep optimization is on.
      //
      // TODO: enable batch_reset even if sweep is on by recompiling
      // the internal circuit.
      //
      throw new error.MachineError("Can't reset machine: sweep is on.");
   }

   if (this.react_in_progress)
      throw new error.MachineError("Cant't reset machine: react in progress.");

   for (let i in this.nets)
      this.nets[i].reset(true);

   this.boot_reg.value = true;
   this.reset_signals(true);

   this.atomic_queue = [];
}

ReactiveMachine.prototype.reset_signals = function(erase_value=false) {
   function _reset_signals(maporlist) {
      for (let i in maporlist)
	 maporlist[i].reset(erase_value);
   }

   _reset_signals(this.global_signal_map);
   _reset_signals(this.local_signal_list);
}

/*---------------------------------------------------------------------*/
/*    addEventListener ...                                             */
/*---------------------------------------------------------------------*/
ReactiveMachine.prototype.addEventListener = function( signame, callback ) {
   if( !this.output_signal_map[ signame ] ) {
      throw new ReferenceError( "unbound output signal `" + signame + "'" );
   }

   if (!(callback instanceof Function))
      throw new TypeError( "Not a function `" + callback + "'", undefined );

   if (!this.host_event_map[ signame ]) {
      this.host_event_map[ signame ] = [];
   }
   this.host_event_map[ signame ].push( callback );
}

/*---------------------------------------------------------------------*/
/*    removeEventListener ...                                          */
/*---------------------------------------------------------------------*/
ReactiveMachine.prototype.removeEventListener =
   function( signame, callback = undefined ) {
      let callback_list = this.host_event_map[ signame ];

      if( callback_list ) {
	 if( callback ) {
	    let i = callback_list.indexOf( callback );

	    if( i > -1 ) callback_list.splice( i, 1 );
	 } else {
	    delete this.host_event_map[ signame ];
	 }
      }
   }

ReactiveMachine.prototype.getElementById = function(id) {
   return (function _find(ast_node, id) {
      if (ast_node.id == id)
	 return ast_node;
      for (let i in ast_node.children) {
	 let el = _find(ast_node.children[i], id);

	 if (el)
	    return el;
      }
      return null;
   })(this.ast, id);
}

ReactiveMachine.prototype.save = function() {
   function _save_signals(map_out, map_in) {
      for (let i in map_out)
	 map_in[i] = {value: map_out[i].value,
		      pre_value: map_out[i].pre_value};
   }

   let machine_state = {};

   machine_state.input_signal_map = {};
   machine_state.output_signal_map = {};
   machine_state.global_signal_map = {};
   machine_state.local_signal_list = [];
   machine_state.registers = {};

   for (let i in this.nets) {
      let n = this.nets[i];

      if (n instanceof net.RegisterNet)
	 machine_state.registers[n.stable_id] = n.value;
   }

   _save_signals(this.input_signal_map, machine_state.input_signal_map);
   _save_signals(this.output_signal_map, machine_state.output_signal_map);
   _save_signals(this.global_signal_map, machine_state.global_signal_map);
   _save_signals(this.local_signal_list, machine_state.local_signal_list);

   return machine_state;
}

ReactiveMachine.prototype.restore = function(machine_state) {
   function _restore_signals(map_out, map_in) {
      for (let i in map_out) {
	 if (!map_in[i])
	    throw error.MachineError("Can't find signal", i, undefined);
	 map_in[i].value = map_out[i].value;
	 map_in[i].pre_value = map_out[i].pre_value;
      }
   }

   _restore_signals(machine_state.input_signal_map, this.input_signal_map);
   _restore_signals(machine_state.output_signal_map, this.output_signal_map);
   _restore_signals(machine_state.global_signal_map, this.global_signal_map);
   _restore_signals(machine_state.local_signal_list, this.local_signal_list);

   for (let i in this.nets) {
      let n = this.nets[i];

      if (n instanceof net.RegisterNet) {
	 let value = machine_state.registers[n.stable_id];

	 if (value != undefined)
	    n.value = value;
      }
   }
}

ReactiveMachine.prototype.pretty_print = function() {
   //
   // If pretty_print after add/remove parallel branch, but before react.
   //
   if (this.lazy_compile)
      this.compile();

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
      } else if (!net_.fanin_list.length) {
	 stats.constants++;
      } else if (net_.fanin_list.length == 1) {
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

//
// Helper function called during machine initialization that defines
// getters/setters of global signal, in order to:
//
//  - read output signal value in DOM, and keep them up-to-date thanks
//    to Hop.js proxies
//
//  - generate promises from output signals which are resolved when
//    the signal is emitted
//
//  - allows to set a signal and react via machine.S = ...
//
const makeSignalAPI = function(m) {
   function signalProxyValueBuilder(signal) {
      return function() {
	 let signalName = signal.name;
	 let proxyValue = m.DOMproxiesValue[signalName];

	 if (!proxyValue) {
	    proxyValue = new hop.reactProxy({value: signal.value});
	    m.DOMproxiesValue[signalName] = proxyValue;
	    m.addEventListener(signalName, function(evt) {
	       proxyValue.value = evt.signalValue;
	    });
	 }

	 return proxyValue.value;
      }
   }

   function signalProxyPresentBuilder(signal) {
      return function() {
	 let signalName = signal.name;
	 let proxyPresent = m.DOMproxiesPresent[signalName];

	 if (!proxyPresent) {
	    proxyPresent = new hop.reactProxy({value: false});
	    m.DOMproxiesPresent[signalName] = proxyPresent;
	    m.addEventListener(signalName, function(evt) {
	       proxyPresent.value = true;
	    });
	 }

	 return proxyPresent.value;
      }
   }

   function signalPromiseBuilder(signal) {
      Object.defineProperty(m.promise, signal.name, {
	 configurable: false,
	 enumerable: false,
	 get: function() {
	    return new Promise(function(resolve, reject) {
	       m.addEventListener(signal.name, function(evt) {
		  resolve(evt.signalValue);
	       });
	    });
	 }
      });
   }

   for (let signalName in m.global_signal_map) {
      let signal = m.global_signal_map[signalName];
      let getterProxyValue;
      let setter;

      if (m.output_signal_map[signalName]) {
	 getterProxyValue = signalProxyValueBuilder(signal);
	 signalPromiseBuilder(signal);
      }

      if (m.input_signal_map[signalName]) {
	 setter = function(value) {
	    m.inputAndReact(signalName, value);
	 }
      }

      Object.defineProperty(m.value, signalName, {
	 configurable: false,
	 enumerable: false,
	 get: getterProxyValue,
	 set: setter
      });

      Object.defineProperty(m.present, signalName, {
	 configurable: false,
	 enumerable: false,
	 writtable: false,
	 get: signalProxyPresentBuilder(signal)
      });
   }
}
