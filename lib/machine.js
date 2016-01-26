"use hopscript"

var compiler = require("./compiler.js");
var error = require("./error.js");
var signal = require("./signal.js");

function ReactiveMachine(ast, name) {
   this.name = name;

   this.input_signals = {};
   this.output_signals = {};
   this.local_signals = {};

   this.nets = [];
   this.registers = [];
   this.known_nets = [];
   this.boot = true;

   this.go;
   this.res;
   this.susp;
   this.kill;
   this.sel;
   this.k;

   this.ast = ast.clone();
   compiler.compile(this, this.ast);
}

exports.ReactiveMachine = ReactiveMachine;

ReactiveMachine.prototype.react = function() {
   var n_nets = this.nets.length;
   var emitted = []; /* useful for batch */

   for (let i in this.nets)
      this.nets[i].reset(this.boot);

   this.go.state = this.boot;
   this.res.state = !this.boot;
   this.boot = false;
   this.known_nets = this.known_nets.concat(this.registers);

   while (this.known_nets.length > 0) {
      this.known_nets.pop().power();
      n_nets--;
   }

   if (n_nets > 0)
      throw new error.CausalityError();

   for (let i in this.output_signals) {
      let sig = this.output_signals[i];

      if (sig.state) {
	 if (sig instanceof signal.ValuedSignal)
	    emitted.push(sig.name + "(" + JSON.stringify(sig.value) + ")")
	 else
	    emitted.push(sig.name);
      }
   }

   return emitted;
}

ReactiveMachine.prototype.setInput = function(signal_name, value) {
   var signal = this.input_signals[signal_name];

   if (!signal)
      throw new error.SignalError("Signal unknown, can't set input on it",
				  signal_name, undefined);

   if (this.known_nets.indexOf(signal) > -1) {
      if (!signal instanceof signal.ValuedSignal || signal.conbine_with)
	 throw new error.SignalError("Single signal input more than one",
				     signal_name, undefined);
   } else {
      this.known_nets.push(signal);
   }

   if (signal instanceof signal.ValuedSignal)
      this.signal.set(value);
   else
      this.signal.set();
}

ReactiveMachine.prototype.inputAndReact = function(signal_name, value) {
   this.setInput(signal_name, value);
   this.react();
}
