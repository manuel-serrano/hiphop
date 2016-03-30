"use strict"
"use hopscript"

const st = require("./inheritance.js");
const net = require("./net.js");
const ast = require("./ast.js");
const error = require("./error.js");

function Signal(ast_node, type) {
   this.ast_node = ast_node;
   this.name = ast_node.signal_name;
   this.gate_list = [];
   this.pre_gate = net.make_and(ast_node, type, this.name + "_pre");
   this.pre_reg = new net.RegisterNet(ast_node, type, this.name + "_pre_reg");
   this.set_by_host = false;

   for (let i = 0; i <= ast_node.depth; i++)
      this.gate_list[i] = net.make_or(ast_node, type, this.name, i);
   this.pre_reg.connect_to(this.pre_gate, net.FAN.STD);
}

exports.Signal = Signal;

Signal.prototype.reset = function(reset_machine) {
   let pre_set = false;

   if (!reset_machine) {
      ;
      for (let i = 0; i < this.gate_list.length; i++)
	 if (this.gate_list[i].value) {
	    pre_set = true;
	    break;
	 }
      this.pre_reg.value = pre_set;
   }
}

function ValuedSignal(ast_node, type) {
   Signal.call(this, ast_node, type);
   this.dependency_gate = net.make_or(ast_node, type, this.name + "_dep");
   this.combine_with = ast_node.combine_with;
   this.init_value = ast_node.init_value;
   this.reinit_func = ast_node.reinit_func;
   this.initialized;
   this.emitted_in_react;
   this.value;
   this.pre_value;

   if (this.init_value == undefined && ast_node.reinit_func)
      this.init_value = ast_node.reinit_func();

   this.reset(true);
}

st.___DEFINE_INHERITANCE___(Signal, ValuedSignal);

exports.ValuedSignal = ValuedSignal;

ValuedSignal.prototype.set_value = function(value) {
   /* Signal with reinitialization always make combinaison with emission */
   if (this.emitted_in_react || (this.reinit_func && this.initialized)) {
      if (!this.combine_with)
	 throw new error.SignalError("Can't set values more that one time"
				     + " in a reaction to a single signal",
				     this.name, this.ast_node.loc);
      else
	 value = this.combine_with.call(null, this.value, value);
   }
   this.value = value;
   this.initialized = true;
   this.emitted_in_react = true;
}

/* Note that `reset_machine` flag is not only use to when reset the machine,
   but also to get a brand new fresh signal in case of reincarnation */

ValuedSignal.prototype.reset = function(reset_machine) {
   Signal.prototype.reset.call(this, reset_machine);

   if (reset_machine) {
      this.value = this.init_value;
      this.pre_value = this.value;
      this.initialized = this.init_value == undefined ? false : true;
   } else {
      this.pre_value = this.value;
      if (this.pre_value instanceof Object)
      	 Object.freeze(this.pre_value);

      if (this.reinit_func) {
	 this.value = this.reinit_func.call();

	 if (!this.initialized)
	    this.pre_value = this.value;
	 this.initialized = true;
      }
   }

   this.emitted_in_react = false;
}
