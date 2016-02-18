"use hopscript"

const net = require("./net.js");

function Signal(ast_node) {
   this.ast_node = ast_node;
   this.name = ast_node.signal_name;
   this.gate_list = [];
   this.pre_gate = net.make_or(ast_node, "pre");
   this.set_by_host = false;

   for (let i = 0; i <= ast_node.depth; i++)
      this.gate_list[i] = net.make_or(ast_node, "___" + i);
}

exports.Signal = Signal;

function ValuedSignal(ast_node) {
   Signal.call(this, ast_node);
   this.dependency_gate = net.make_or(ast_node, "dep");
   this.combine_with = ast_node.combine_with;
   this.init_value = ast_node.init_value;
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
