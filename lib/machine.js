"use hopscript"

const compiler = require("./compiler.js");
const error = require("./error.js");
const ast = require("./ast.js");
const net = require("./net.js");

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
   function sig_discovery(sig_list) {
      /* This permit a signal with no emitters in the circuit to send 0/1
	 to they dependencies */
      var ret = [];

      for (let i in sig_list)
	 if (sig_list[i].fanin.length == 0)
	    ret.push(sig_list[i]);
      return ret;
   }

   var n_nets = this.nets.length;
   var emitted = []; /* useful for batch */

   /* reset everything except input signals (and register, but they manage
      it internally */
   for (let i in this.nets) {
      if (this.nets[i] instanceof net.Signal && this.nets[i].input)
	 continue;
      this.nets[i].reset(false);
   }

   this.go.state = this.boot;
   this.res.state = !this.boot;
   this.boot = false;
   this.known_nets = this.known_nets
      .concat(this.registers)
      .concat(sig_discovery(this.input_signals))
      .concat(sig_discovery(this.output_signals))
      .concat(sig_discovery(this.local_signals));

   while (this.known_nets.length > 0) {
      let n = this.known_nets.pop();
      n.power();
      n.done = true;
      n_nets--;
   }

   if (n_nets > 0) {
      for (let i in this.nets)
   	 if (!this.nets[i].done)
   	    console.log(this.nets[i].ast_node.name)
      throw new error.CausalityError(this.nets.length - n_nets);
   }

   for (let i in this.output_signals) {
      let sig = this.output_signals[i];

      if (sig.state) {
	 if (sig instanceof net.ValuedSignal)
	    emitted.push(sig.name + "(" + JSON.stringify(sig.value) + ")")
	 else
	    emitted.push(sig.name);
      }
   }

   /* reset input signals */
   for (let i in this.input_signals)
      this.input_signals[i].reset(false);

   return emitted;
}

ReactiveMachine.prototype.setInput = function(signal_name, value) {
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
   this.boot = true;
   for (let i in this.nets)
      this.nets[i].reset(true);
}
