"use hopscript"

var compiler = require("./compiler.js");
var error = require("./error.js");

function ReactiveMachine(ast, name) {
   this.ast = ast.clone();
   this.name = name;
   this.nets = [];

   this.known_nets = [];
   this.pauses = [];
   this.boot = true;

   this.input_signals = {};
   this.output_signals = {};
   this.local_signals = {};

   this.go = [];
   this.res = [];
   this.susp = [];
   this.kill = [];
   this.sel = [];
   this.k = [[]];

   compiler.compile(this, this.ast);
}

exports.ReactiveMachine = ReactiveMachine;

ReactiveMachine.prototype.react = function() {
   var n_nets = this.nets.length;
   var emitted = []; /* useful for batch */

   for (let i in this.nets)
      this.nets[i].reset(this.boot);

   if (!this.boot) {
      this.known_nets = this.known_nets.concat(this.pauses);
      this.pauses = [];
      for (let i in this.res) {
	 this.res[i].state = true;
	 this.known_nets.push(this.res[i]);
      }
   } else {
      for (let i in this.go) {
	 this.go[i].state = true;
	 this.known_nets.push(this.go[i]);
      }
      this.boot = false;
   }
   console.log(this.known_nets);
   while (this.known_nets.length > 0) {
      this.known_nets.pop().power();
      n_nets--;
   }

   if (n_nets > 0)
     throw new error.CausalityError();

   for (let i in this.output_signals) {
      let sig = this.output_signals[i];

      if (sig.state) {
	 if (sig instanceof net.ValuedSignal)
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
      if (!signal instanceof net.ValuedSignal || signal.conbine_with)
	 throw new error.SignalError("Single signal input more than one",
				     signal_name, undefined);
   } else {
      this.known_nets.push(signal);
   }

   if (signal instanceof net.ValuedSignal)
      this.signal.set(value);
   else
      this.signal.set();
}

ReactiveMachine.prototype.inputAndReact = function(signal_name, value) {
   this.setInput(signal_name, value);
   this.react();
}
