"use hopscript"

const net = require("./net.js");

function SignalAccessor(signal_name, get_pre, get_value) {
   this.signal = signal;
   this.get_pre = get_pre;
   this.get_value = get_value;
}

exports.SignalAccessor = SignalAccessor;

SignalAccessor.prototype.get = function(incarnation) {
   throw error.InternalError("NYI", "SignalAccessor");
}

function present(name) {
   return new SignalAccessor(name, false, false);
}

exports.present = present;

function prePresent(signame) {
   return new SignalAccessor(name, true, false);
}

exports.prePresent = prePresent;

function value(signame) {
   return new SignalAccessor(name, false, true);
}

exports.value = value;

function preValue(signame) {
   return new SignalAccessor(name, true, true);
}

exports.preValue = preValue;

function Signal(ast, name, input) {
   this.name = name;
   this.state;
   this.reset(true);

   /* If a signal is an input signal, we add a register on it that we'll
      plug on every signal test. It allow to known if the signal is set
      by the global environment before the reaction */
   if (input)
      this.input = new net.Register(ast);

   /* AST node that write on it */
   this.emitters = [];
}

exports.Signal = Signal;

Signal.prototype.set = function() {
   this.state = true;
}

Signal.prototype.reset = function(reset_machine) {
   this.state = false;
}

Signal.prototype.add_emitter = function(ast_node, write_value) {
   this.emitters.push({ast_node: ast_node,
		       write_value: write_value});
}

function ValuedSignal(ast_node, name, input, combine_with, init_value, type) {
   Signal.call(this, ast_node, name, input);
   this.combine_with = combine_with;
   this.init_value = init_value;
   this.type = type;
   this.initialized;
   this.value;
}

ValuedSignal.prototype = new Signal(undefined, undefined, undefined);

exports.ValuedSignal = ValuedSignal;

ValuedSignal.prototype.set = function(value) {
   if (this.state && !this.combine_with)
      throw new error.SignalError("Can't set multiple values on single signal",
				  this.name, this.ast_node.loc);

   if (!this.state && this.conbine_with)
      value = this.combine_with.call(null, this.value, value);

   this.value = value;
   this.state = true;
}

ValuedSignal.prototype.reset = function(reset_machine) {
   Signal.prototype.reset.call(this, reset_machine);
   if (reset_machine) {
      this.value = this.init_value;
      this.initialized = this.init_value ? true : false;
   }
}
