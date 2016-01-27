"use hopscript"

const compiler = require("./compiler.js");
const error = require("./error.js");
const signal = require("./signal.js");
const ast = require("./ast.js");

function ReactiveMachine(ast_node, name) {
   if (!(ast_node instanceof ast.Module))
      throw new error.TypeError("Module", typeof(ast_node),
				"machine name: " + name);
   this.name = name;

   this.input_signals = {};
   this.output_signals = {};
   this.local_signals = {};

   this.nets = [];
   this.registers = [];
   this.known_nets = [];
   this.boot;

   this.go;
   this.res;
   this.susp;
   this.kill;

   this.ast = ast_node.clone();
   compiler.compile(this, this.ast);
   this.reset();
}

exports.ReactiveMachine = ReactiveMachine;

ReactiveMachine.prototype.react = function() {
   var n_nets = this.nets.length;
   var emitted = []; /* useful for batch */

   for (let i in this.nets)
      this.nets[i].reset(false);

   this.go.state = this.boot;
   this.res.state = !this.boot;
   this.boot = false;
   this.known_nets = this.known_nets.concat(this.registers);

   while (this.known_nets.length > 0) {
      this.known_nets.pop().power();
      n_nets--;
   }

   if (n_nets > 0)
      throw new error.CausalityError(this.nets.length - n_nets);

   for (let i in this.output_signals) {
      let sig = this.output_signals[i];

      if (sig.state) {
	 if (sig instanceof signal.ValuedSignal)
	    emitted.push(sig.name + "(" + JSON.stringify(sig.value) + ")")
	 else
	    emitted.push(sig.name);
      }
   }

   /* reset only input_signals register (use to know if external environment
      set the signal). Output and locals are reset at begining of the reaction
      by emitters which are reseted */
   for (let i in this.input_signals) {
      this.input_signals[i].reset(false);
   }

   return emitted;
}

ReactiveMachine.prototype.setInput = function(signal_name, value) {
   var sig = this.input_signals[signal_name];

   if (!sig)
      throw new error.SignalError("Signal unknown, can't set input on it",
				  signal_name, undefined);

   if (sig instanceof signal.ValuedSignal)
      sig.set(value);
   else
      sig.set();
}

ReactiveMachine.prototype.inputAndReact = function(signal_name, value) {
   this.setInput(signal_name, value);
   return this.react();
}

ReactiveMachine.prototype.reset = function() {
   this.boot = true;
   for (let i in this.nets)
      this.nets[i].reset(true);
}
