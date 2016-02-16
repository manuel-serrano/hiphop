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

   var nonpropagated_nets = this.nets.length;
   var known_list = [];
   var emitted = []; /* useful for batch */

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
	 known_list.push(sig.gate[0]);
      }
   }

   while (known_list.length > 0) {
      let cur = known_list.splice(0, 1)[0];

      console.log("propagate", cur.debug_name);
      cur.propagate(known_list);
      nonpropagated_nets--;
   }

   if (nonpropagated_nets > 0)
      throw new error.CausalityError(this.nets.length - nonpropagated_nets);

   for (let i in this.output_signal_map) {
      let sig = this.output_signal_map[i];

      if (sig.gate_list[0].value) {
	 if (sig instanceof signal.ValuedSignal)
	    emitted.push(sig.name + "(" + JSON.stringify(sig.value) + ")")
	 else
	    emitted.push(sig.name);
      }
   }

   this.react_in_progress = false;
   return emitted;
}

ReactiveMachine.prototype.setInput = function(signal_name, value) {
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

ReactiveMachine.prototype.inputAndReact = function(signal_name, value) {
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
}
