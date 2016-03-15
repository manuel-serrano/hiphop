"use strict"
"use hopscript"

const compiler = require("./compiler.js");
const error = require("./error.js");
const ast = require("./ast.js");
const net = require("./net.js");
const signal = require("./signal.js");

function ReactiveMachine(ast_node, name) {
   if (!(ast_node instanceof ast.Module))
      throw new error.TypeError("Module", typeof(ast_node),
				"machine name: " + name);

   /* 0: no trace at all
      1: display some environment informations
      2: 1 + trace of propagation
   */
   this.trace_on = 0

   this.name = name;
   this.react_in_progress = false;

   this.input_signal_map = {};
   this.output_signal_map = {};
   this.local_signal_map = {};

   this.nets = [];
   this.boot_reg = null;

   /* control gates */
   this.sel = null;
   this.k0 = null;
   this.k1 = null;

   this.ast = ast_node.clone();
   compiler.compile(this, this.ast);
   this.reset();
}

exports.ReactiveMachine = ReactiveMachine;

ReactiveMachine.prototype.react = function() {
   if (this.react_in_progress)
      throw error.MachineError(this.name, "can't react: react in progress.");
   this.react_in_progress = true;

   let nonpropagated_nets = this.nets.length;
   let known_list = [];
   let emitted = []; /* useful for batch */

   for (let i in this.nets) {
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

   while (known_list.length > 0) {
      known_list.shift().propagate(known_list);
      nonpropagated_nets--;
   }

   if (nonpropagated_nets > 0)
      throw new error.CausalityError(nonpropagated_nets);

   for (let i in this.output_signal_map) {
      let sig = this.output_signal_map[i];

      if (sig.gate_list[0].value) {
	 if (sig instanceof signal.ValuedSignal)
	    emitted.push(sig.name + "(" + JSON.stringify(sig.value) + ")")
	 else
	    emitted.push(sig.name);
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

ReactiveMachine.prototype.setInput = function(signal_name, value=undefined) {
   if (this.react_in_progress)
      throw error.MachineError(this.name, "can't set input: " +
			       "react in progress.");

   let sig = this.input_signal_map[signal_name];

   if (!sig)
      throw new error.SignalError("Signal unknown, can't set input on it",
				  signal_name, undefined);

   sig.set_by_host = true;
   if (sig instanceof signal.ValuedSignal && value != undefined)
      sig.env_set_value(value);
}

ReactiveMachine.prototype.inputAndReact = function(signal_name,
						   value=undefined) {
   this.setInput(signal_name, value);
   return this.react();
}

ReactiveMachine.prototype.reset = function() {
   if (this.react_in_progress)
      throw error.MachineError(this.name, "can't reset machine: " +
			       "react in progress.");
   for (let i in this.nets)
      this.nets[i].reset(true);

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
