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
   this.first_react = true;

   this.input_signals = {};
   this.output_signals = {};

   this.nets = [];
   this.boot_reg;

   this.go;
   this.res;
   this.susp;
   this.kill;
   this.sel;
   this.k;

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
      let net = this.nets[i];

      if (net instanceof net.RegisterNet)
	 known_list.push(net)
      else if (net instanceof net.LogicalNet && net.fanin_list.length == 0)
	 known_list.push(net);
      net.reset(false);
   }

   if (this.first_react) {
      this.boot_reg.value = true;
      this.first_react = false;
   } else {
      this.boot_reg.value = false;
   }

   while (this.known_nets.length > 0) {
      this.known_nets.pop().propagate();
      nonpropagated_nets--;
   }

   if (nonpropagated_nets > 0)
      throw new error.CausalityError(this.nets.length - nonpropagated_nets);

   for (let i in this.output_signals) {
      let sig = this.output_signals[i];

      if (sig.state) {
	 if (sig instanceof net.ValuedSignal)
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
   var sig = this.input_signals[signal_name];

   if (!sig)
      throw new error.SignalError("Signal unknown, can't set input on it",
				  signal_name, undefined);

   if (sig instanceof net.ValuedSignal)
      sig.env_set_value(value);
   else
      sig.env_set();
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
}
