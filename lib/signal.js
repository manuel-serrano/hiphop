"use hopscript"

function Signal(ast_node, name, input) {
   this.name = name;
   this.input = input;
   this.pre_state;
   this.reset(true);
}

exports.Signal = Signal;

Signal.prototype.set_state = function(state) {
   this.state = state || this.state;
}

/* Use to set an input signal from the environment between two reactions */

Signal.prototype.env_set = function() {
   if (this.input)
      this.state = true;
   else
      throw new error.SignalError("Can't call `env_set` on non InputSignal",
				  this.name,
				  this.ast_node.loc);
}

Signal.prototype.reset = function(reset_machine) {
   Net.prototype.reset.call(this, reset_machine);
   if (reset_machine)
      this.pre_state = false;
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

ValuedSignal.prototype.set_value = function(value) {
   if (this.state && !this.combine_with)
      throw new error.SignalError("Can't set values more that one time"
				  + " in a reaction to a singlesignal",
				  this.name, this.ast_node.loc);

   if (!this.state && this.conbine_with)
      value = this.combine_with.call(null, this.value, value);

   this.value = value;
   this.initialized = true;
}

ValuedSignal.prototype.env_set_value = function(value) {
   this.set_value(value);
   Signal.prototype.env_set.call(this);
}

/* Note that `reset_machine` flag is not only use to when reset the machine,
   but also to get a brand new fresh signal in case of reincarnation */

ValuedSignal.prototype.reset = function(reset_machine) {
   Signal.prototype.reset.call(this, reset_machine);
   if (reset_machine) {
      this.value = this.init_value;
      this.pre_value = this.value;
      this.initialized = this.init_value ? true : false;
   } else {
      this.pre_value = this.value;
      if (this.pre_value instanceof Object)
      	 Object.freeze(this.pre_value);
   }


}
