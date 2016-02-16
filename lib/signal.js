"use hopscript"

function Signal(name, gate_list) {
   this.name = name;
   this.gate_list = gate_list;
   this.pre_gate;
   this.set_by_host = false;
}

exports.Signal = Signal;

function ValuedSignal(name, gate_list, combine_with, init_value) {
   Signal.call(this, name, gate_list);
   this.dependency_gate_list = []
   this.combine_with = combine_with;
   this.init_value = init_value;
   this.initialized;
   this.emitted_in_react;
   this.value;
   this.pre_value;
   this.reset(true);
}

___DEFINE_INHERITANCE___(Signal, ValuedSignal);

exports.ValuedSignal = ValuedSignal;

ValuedSignal.prototype.set_value = function(value) {
   if (this.emitted_in_react && !this.combine_with)
      throw new error.SignalError("Can't set values more that one time"
				  + " in a reaction to a singlesignal",
				  this.name, this.ast_node.loc);

   if (this.conbine_with)
      value = this.combine_with.call(null, this.value, value);
   this.value = value;
   this.initialized = true;
   this.emitted_in_react = true;
}

/* Note that `reset_machine` flag is not only use to when reset the machine,
   but also to get a brand new fresh signal in case of reincarnation */

ValuedSignal.prototype.reset = function(reset_machine) {
   if (reset_machine) {
      this.value = this.init_value;
      this.pre_value = this.value;
      this.initialized = this.init_value ? true : false;
   } else {
      this.pre_value = this.value;
      if (this.pre_value instanceof Object)
      	 Object.freeze(this.pre_value);
   }

   this.emitted_in_react = false;
}
