"use strict"
"use hopscript"

const hh = require("./hiphop.js");
const compiler = require("./compiler.js");
const error = require("./error.js");
const ast = require("./ast.js");
const net = require("./net.js");
const signal = require("./signal.js");
const lang = require("./lang.js");

function ReactiveMachine(ast_node, name="") {
   if (!(ast_node instanceof ast.Module))
      throw new error.TypeError("Module", typeof(ast_node),
				"machine name: " + name);

   //
   // 0: no trace at all
   // 1: display some environment informations
   // 2: 1 + trace of propagation
   //
   this.trace_on = 0

   //
   // Compilation context. Freed when compilation over. See
   // compiler.js.
   //
   this.cc_local_signal_stack = null;

   //
   // Trigger compilation of the machine only when needed.
   //
   this.lazy_compile = false;

   //
   // ast_node which we have to remove nets at the end of the
   // reaction.
   //
   this.lazy_branch_removal_list = [];

   this.name = name;
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
   this.DOMproxies = {};

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

   // console.time("initial_compilation_time");
   this.compile();
   // console.timeEnd("initial_compilation_time");

   //
   // Generation of accessors get/set for each output signals
   //
   for (let signalName in this.output_signal_map) {
      let signal = this.output_signal_map[signal];

      Object.defineProperty(this, signalName, {
	 configurable: false,
	 enumerable: false,
	 get: function() {
	    return this.value(signalName);
	 },
	 set: function(value) {
	    this.inputAndReact(signalName, value);
	 }
      });
   }
}

exports.ReactiveMachine = ReactiveMachine;

ReactiveMachine.prototype.compile = function() {
   //
   // FIXME: Input signal set after appendChild and before the
   // following reaction will be erased. It should not.
   //
   let state = null;

   if (this.lazy_compile)
      state = this.save();

   compiler.compile(this, this.ast);
   this.reset();

   if (this.lazy_compile) {
      this.restore(state);
      this.lazy_compile = false;
   }
}

ReactiveMachine.prototype.react = function() {
   if (this.react_in_progress)
      throw error.MachineError(this.name, "can't react: reactive machine in " +
			       "inconsistent state. Please reset it.");

   if (this.lazy_compile)
      this.compile();
   this.branch_removal();
   this.react_in_progress = true;

   let nonpropagated_nets = this.nets.length;
   let known_list = [];

   //
   // Usefull for batch
   //
   let emitted = [];

   //
   // known_list can't be computed at compile time because registers
   // and constant can changes on the fly (appendChild/removeChild).
   //
   for (let i = 0; i < this.nets.length; i++) {
      let current_net = this.nets[i];

      if (current_net instanceof net.RegisterNet)
	 known_list.push(current_net)
      else if (current_net instanceof net.LogicalNet &&
	       current_net.fanin_list.length == 0)
	 known_list.push(current_net);
      current_net.reset(false);
   }

   for (let i in this.input_signal_map) {
      let sig = this.input_signal_map[i];

      //
      // Signal emitted by host before the reaction (machine.input())
      //
      if (sig.emitted)
	 sig.gate_list[0].value = true;
   }

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
	    if (!this.nets[i].has_been_propagated &&
		this.nets[i].fanin_list.length > 0) {
	       console.log("!!!", this.nets[i].debug_name);
	    }
	 }
      }

      throw new error.CausalityError(nonpropagated_nets, listing);
   }

   for (let i in this.output_signal_map) {
      let sig = this.output_signal_map[i];

      if (sig.gate_list[0].value) {
	 let buf = sig.name;

	 if (sig.value !== undefined) {
	    let string_value;

	    try {
	       string_value = JSON.stringify(sig.value);
	    } catch (e) {
	       string_value = sig.value;
	    }
	    buf += "(" + string_value + ")";
	 }
	 emitted.push(buf);
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

      if (state.kill || state.start) {
   	 if (state.kill) {
   	    state.kill = false;

	    if (state.func_kill) {
   	       state.func_kill();
	    }
   	 }

   	 if (state.start) {
	    state.id = get_exec_id();

	    //
	    // TODO: use Obhect.assign when it will works in Hop.js
	    //
	    let vals = signal.generate_this(state.ast_node.accessor_list,
					    state.lvl);
	    let self = {
	       id: state.id,
	       return: function(value=undefined) {
		  if (state.id == self.id) {
		     state.value = value;
		     state.active = false;
		     state.prev_active = true;
		     return true;
		  }
		  return false;
	       },
	       returnAndReact: function(value=undefined) {
		  if (self.return(value)) {
		     if (state.ast_node.machine.react_in_progress) {
			throw new error.RuntimeError(
			   "EXEC cannot returnAndReact immediatly.", null);
		     }
		     state.ast_node.machine.react();
		  }
	       },
	       value: vals.value,
	       preValue: vals.preValue,
	       present: vals.present,
	       prePresent: vals.prePresent
	    };

   	    state.active = true;
   	    state.start = false;
   	    state.prev_active = false;
   	    state.suspended = false;
   	    state.prev_suspended = false;
   	    state.func_start.apply(self);
	 }
      } else if (state.suspended && !state.prev_suspended) {
   	 state.prev_suspended = true;
   	 if (state.func_susp)
   	    state.func_susp();
      } else if (!state.suspended && state.prev_suspended) {
   	 state.prev_suspended = false;
   	 if (state.func_res)
   	    state.func_res();
      }

   }

   this.reset_signals();
   if (this.trace_on)
      console.error("SEL:" + (this.sel ? this.sel.value : false),
		    "K0:" + (this.k0 ? this.k0.value : false),
		    "K1:" + (this.k1 ? this.k1.value : false));

   this.react_in_progress = false;
   return emitted;
}

ReactiveMachine.prototype.input = function(signal, value=undefined) {
   let signal_name;
   let signal_object;

   if (this.react_in_progress)
      throw new error.MachineError(this.name, "can't set input: " +
				   "react in progress.");

   if (typeof(signal) == "object") {
      signal_name = signal.signalName;
      value = signal.signalValue;
   } else {
      signal_name = signal;
   }

   signal_object = this.input_signal_map[signal_name];

   if (!signal_object)
      throw new error.SignalError("Signal unknown, can't set input on it",
				  signal_name, undefined);

   signal_object.set_value(value);
}

ReactiveMachine.prototype.inputAndReact = function(signal, value=undefined) {
   this.input(signal, value);
   return this.react();
}

ReactiveMachine.prototype.reset = function() {
   if (this.react_in_progress)
      throw new error.MachineError(this.name, "can't reset machine: " +
				   "react in progress.");
   for (let i in this.nets)
      this.nets[i].reset(true);

   this.lazy_branch_removal_list = [];
   this.boot_reg.value = true;
   this.reset_signals();
}

ReactiveMachine.prototype.reset_signals = function() {
   function _reset_signals(maporlist) {
      for (let i in maporlist)
	 maporlist[i].reset();
   }

   _reset_signals(this.global_signal_map);
   _reset_signals(this.local_signal_list);
}

ReactiveMachine.prototype.addEventListener = function(signal_name, callback) {
   if (!this.output_signal_map[signal_name])
      throw new error.SignalError("Output signal unknown, can't set handler on it",
				  signal_name, undefined);

   if (!(callback instanceof Function))
      throw new error.TypeError("Function", typeof(callback), undefined);

   if (callback.length != 1)
      throw new error.TypeError("Function with arity 1",
				"Function with arity " + callback.length,
				undefined);

   if (!this.host_event_map[signal_name])
      this.host_event_map[signal_name] = [];
   this.host_event_map[signal_name].push(callback);
}

ReactiveMachine.prototype.removeEventListener = function(signal_name,
							 callback=undefined) {
   let callback_list = this.host_event_map[signal_name];

   if (callback_list) {
      if (callback) {
	 let i = callback_list.indexOf(callback);

	 if (i > -1)
	    callback_list.splice(i, 1);
      } else {
	 delete this.host_event_map[signal_name];
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

ReactiveMachine.prototype.branch_removal = function() {
   for (let i in this.lazy_branch_removal_list) {
      let ast_node = this.lazy_branch_removal_list[i];

      for (let j in ast_node.net_list) {
	 let n = ast_node.net_list[j];

	 this.nets.splice(this.nets.indexOf(n), 1);

	 for (let k in n.fanin_list) {
	    let in_net = n.fanin_list[k].net;

	    if (in_net.ast_node != ast_node)
	       in_net.remove_out_net(n);
	 }

	 for (let k in n.fanout_list) {
	    let out_net = n.fanout_list[k].net;

	    if (out_net.ast_node != ast_node)
	       out_net.remove_in_net(n);
	 }
      }
      ast_node.net_list = [];
      ast_node.register_list = null;
   }

   this.lazy_branch_removal_list = [];
}

//
// This function takes an output signal name as arguments, and returns
// a Hop.js proxy (which is cached internally).
//
ReactiveMachine.prototype.value = function(signalName) {
   let proxy = this.DOMproxies[signalName];

   if (!proxy) {
      let sig = this.output_signal_map[signalName];
      if (!sig)
	 throw new error.SignalError("Can't find signal.", sig_name,
				     undefined);

      proxy = new hop.reactProxy({value: sig.init_value});
      this.DOMproxies[signalName] = proxy;

      this.addEventListener(signalName, function(evt) {
	 proxy.value = evt.signalValue;
      });
   }

   return proxy.value;
}

ReactiveMachine.prototype.stats = function() {
   let stats = {
      gates: this.nets.length,
      buffers: 0
   }

   for (let i = 0; i < this.nets.length; i++) {
      if (this.nets[i] instanceof net.RegisterNet)
	 continue;
      if (this.nets[i].fanin_list.length != 1 ||
	  this.nets[i].fanout_list.length != 1)
	 continue;
      if (!this.nets[i].fanout_list[0].polarity ||
	  this.nets[i].fanout_list[0].dependency)
	 continue;
      stats.buffers++;
   }

   return stats;
}

const get_exec_id = (function() {
   let id = 1;

   return function() {
      return ++id;
   }
})();
