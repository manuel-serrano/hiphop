"use hopscript"

const net = require("./net.js");

function SignalAccessor(signal_name, get_pre, get_value) {
   this.signal_name = signal_name;
   this.get_pre = get_pre;
   this.get_value = get_value;
}

exports.SignalAccessor = SignalAccessor;

function present(signal_name) {
   return new SignalAccessor(signal_name, false, false);
}

exports.present = present;

function prePresent(signal_name) {
   return new SignalAccessor(signal_name, true, false);
}

exports.prePresent = prePresent;

function value(signal_name) {
   return new SignalAccessor(signal_name, false, true);
}

exports.value = value;

function preValue(signal_name) {
   return new SignalAccessor(signal_name, true, true);
}

exports.preValue = preValue;

function Signal(ast, name, input) {
   this.name = name;
   this.state;
   this.pre_state;
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
   if (this.input)
      this.input.state = true;
}

Signal.prototype.reset = function(reset_machine) {
   if (!reset_machine)
      this.pre_state = this.state;
   else
      this.pre_state = false;
   this.state = false;
   if (this.input)
      this.input.state = false;
}

Signal.prototype.add_emitter = function(ast_node) {
   this.emitters.push(ast_node);
}

function ValuedSignal(ast_node, name, input, combine_with, init_value, type) {
   Signal.call(this, ast_node, name, input);
   this.combine_with = combine_with;
   this.init_value = init_value;
   this.type = type;
   this.initialized;
   this.value;
   this.pre_value;
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
   Signal.prototype.set.call(this);
}

ValuedSignal.prototype.reset = function(reset_machine) {
   Signal.prototype.reset.call(this, reset_machine);
   if (reset_machine) {
      this.value = this.init_value;
      this.pre_value = this.value;
      this.initialized = this.init_value ? true : false;
   } else {
      this.pre_value = this.value;

      // if (this.pre_value)
      // 	 Object.freeze(this.pre_value);
   }
}
