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

   /* 0: no trace at all
      1: display some environment informations
      2: 1 + trace of propagation
   */
   this.trace_on = 0

   /* trigger compilation of the machine only when needed */
   this.lazy_compile = false;

   /* ast_node which we have to remove nets at the end of the reaction */
   this.lazy_branch_removal_list = [];

   this.name = name;
   this.react_in_progress = false;

   this.input_signal_map = {};
   this.output_signal_map = {};
   this.local_signal_map = {};
   this.local_signal_next_id = 0;

   this.host_event_map = {};

   /* exec_status struct, see compiler.js:ast.Exec.prototype.make_circuit. */
   this.exec_status_list = [];

   this.nets = [];
   this.boot_reg = null;

   /* control gates */
   this.sel = null;
   this.k0 = null;
   this.k1 = null;

   this.ast = ast_node.clone();
   this.compile();
}

exports.ReactiveMachine = ReactiveMachine;

ReactiveMachine.prototype.compile = function() {
   /* FIXME: Input signal set after appendChild and before the following
      reaction will be erased. It should not. Fix it */
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
   let emitted = []; /* useful for batch */

   /* `known_list` can't be computed at compile time because registers and
      constant can changes on the fly (appendChild/removeChild). */
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

      if (sig.set_by_host) {
	 sig.gate_list[0].value = true;
	 sig.set_by_host = false;
      }
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

   if (nonpropagated_nets > 0)
      throw new error.CausalityError(nonpropagated_nets);

   for (let i in this.output_signal_map) {
      let sig = this.output_signal_map[i];
      let valued = sig instanceof signal.ValuedSignal;

      if (sig.gate_list[0].value) {
	 if (valued)
	    emitted.push(sig.name + "(" + JSON.stringify(sig.value) + ")")
	 else
	    emitted.push(sig.name);

	 let callback_list = this.host_event_map[sig.name];
	 if (callback_list) {
	    let stop_propagation = false;
	    let event = { signalName: sig.name,
			  stopPropagation: function() {
			     stop_propagation = true;
			  }
			};

	    if (valued)
	       event.signalValue = sig.value;

	    for (let i = 0; i < callback_list.length && !stop_propagation; i++)
	       callback_list[i].call(null, event);
	 }
      }
   }

   /* trigger exec */
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
	    /* As start_func is not embedded in a ActionNet, we have
   	       to generate runtime array used by
   	       signal.generate_this.

	       BUT, the good part is as the reaction is over, we can
   	       freely takes value/presence of signal without caring
   	       about dependencies.
	    */
   	    let accessor_list = state.ast_node.func_start_accessor_list.map(
	       function(el, i, arr) {
		  let sig = compiler.get_signal_object(state.ast_node.machine,
						       el.signal_name);
		  let sig_depth = sig.ast_node.depth;
   		  let lvl = sig_depth < state.lvl ? sig_depth : state.lvl;
		  let accessor = new lang.SignalAccessor(el.signal_name,
							 el.get_pre,
							 el.get_value);

		  accessor.runtime = [];
		  if (el.get_value) {
   		     accessor.runtime[state.lvl] = sig;
   		  } else {
		     if (el.get_pre) {
   			accessor.runtime[state.lvl] = sig.pre_gate;
   		     } else {

   			accessor.runtime[state.lvl] = sig.gate_list[lvl];
   		     }
		  }

		  return accessor;
	       });

	    /* use Obhect.assign when it will works in Hop.js */
	    let vals = signal.generate_this(accessor_list, state.lvl);

	    state.id = get_exec_id();
   	    state.active = true;
   	    state.start = false;
   	    state.prev_active = false;
   	    state.suspended = false;
   	    state.prev_suspended = false;
   	    state.func_start.apply({
	       id: state.id,
	       return: function(value=undefined) {
		  if (state.id == this.id) {
		     state.value = value;
		     state.active = false;
		     state.prev_active = true;
		  }
	       },
	       returnAndReact: function(value=undefined) {
		  this.return(value);
		  state.ast_node.machine.react();
	       },
	       value: vals.value,
	       preValue: vals.preValue,
	       present: vals.present,
	       prePresent: vals.prePresent
	    });
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

   this.reset_signals(false);
   if (this.trace_on)
      console.error("SEL:" + (this.sel ? this.sel.value : false),
		    "K0:" + (this.k0 ? this.k0.value : false),
		    "K1:" + (this.k1 ? this.k1.value : false));

   this.react_in_progress = false;
   return emitted;
}

ReactiveMachine.prototype.input = function(signal_name, value=undefined) {
   if (this.react_in_progress)
      throw new error.MachineError(this.name, "can't set input: " +
				   "react in progress.");

   let sig = this.input_signal_map[signal_name];

   if (!sig)
      throw new error.SignalError("Signal unknown, can't set input on it",
				  signal_name, undefined);

   if (sig.task_signal)
      throw new error.SignalError("Input signal reserved for task/exec.",
				  signal_name, undefined);

   sig.set_by_host = true;
   if (sig instanceof signal.ValuedSignal) {
      if (value != undefined)
	 sig.set_value(value);
      else if (!sig.initialized)
	 throw new error.SignalError("Uninitialized valued signal. A value" +
				     " must be given", signal_name, undefined);
   } else if (value) {
      throw new error.SignalError("Pure signal, can't set value of it",
				  signal_name, undefined);
   }
}

ReactiveMachine.prototype.inputAndReact = function(signal,
						   value=undefined) {
   if (signal instanceof Object) {
      lang.type_test(signal.signalName, String, undefined);
      this.input(signal.signalName, signal.signalValue);
   } else {
      this.input(signal, value);
   }
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
   this.reset_signals(true);
}

ReactiveMachine.prototype.reset_signals = function(reset_machine) {
   function _reset_signals(map) {
      for (let i in map)
	 map[i].reset(reset_machine);
   }

   _reset_signals(this.input_signal_map);
   _reset_signals(this.output_signal_map);
   _reset_signals(this.local_signal_map);
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
   machine_state.local_signal_map = {};
   machine_state.registers = {};

   for (let i in this.nets) {
      let n = this.nets[i];

      if (n instanceof net.RegisterNet)
	 machine_state.registers[n.stable_id] = n.value;
   }

   _save_signals(this.input_signal_map, machine_state.input_signal_map);
   _save_signals(this.output_signal_map, machine_state.output_signal_map);
   _save_signals(this.local_signal_map, machine_state.local_signal_map);

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
   _restore_signals(machine_state.local_signal_map, this.local_signal_map);

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

ReactiveMachine.prototype.reactProxy = function(sig_name) {
   let sig = this.output_signal_map[sig_name];
   let proxy;

   if (!sig)
      throw new error.SignalError("Can't find signal to make proxy.", sig_name,
				  undefined);
   if (!(sig instanceof signal.ValuedSignal))
       throw new error.SignalError("Proxy are availible only on valued signal.",
				   sig_name, undefined);

   proxy = new hop.reactProxy({value: sig.init_value});
   this.addEventListener(sig_name, function(evt) {
      proxy.value = evt.signalValue;
   });

   return proxy;
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
