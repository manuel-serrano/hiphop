"use strict"
"use hopscript"

const st = require("./inheritance.js");
const net = require("./net.js");
const ast = require("./ast.js");
const error = require("./error.js");

function Signal(ast_node, type, k1_list, kill_list, susp) {
   this.ast_node = ast_node;
   this.name = ast_node.signal_name;
   this.gate_list = [];
   this.pre_reg = new net.RegisterNet(ast_node, type, this.name + "_pre_reg");
   this.pre_gate = net.make_or(ast_node, type, this.name + "_pre_gate");
   this.set_by_host = false;

   /* The pre_gate is not the register but a door which the register is
      connected to. Because on presence/value test, the action gate that
      makes the test waits for the pre_gate propagates, and when the action
      gate propagate it takes the value of pre_gate. If pre_gate is a register
      it can already have its value override... */
   this.pre_reg.connect_to(this.pre_gate, net.FAN.STD);


   /* building a local signal. lot of stuff is needed to handle pre on local */
   if (k1_list && kill_list && susp) {
      let or_to_pre = net.make_or(ast_node, type, this.name + "_or_to_pre");
      let pre_and_susp = net.make_and(ast_node, type,
				      this.name + "_pre_and_susp");
      let to_pre_p = [];
      let to_pre_not_susp = net.make_or(ast_node, type,
					this.name + "_to_pre_not_susp");

      for (let i = 0; i <= ast_node.depth; i++) {
	 /* signal door generation */
	 this.gate_list[i] = net.make_or(ast_node, type, this.name, i);

	 /* signal intermediate pre door generation */
	 to_pre_p[i] = net.make_and(ast_node, type, this.name + "_to_pre_p", i);
	 this.gate_list[i].connect_to(to_pre_p[i], net.FAN.STD);
	 k1_list[i].connect_to(to_pre_p[i], net.FAN.STD);
	 kill_list[i].connect_to(to_pre_p[i], net.FAN.NEG);

	 if (i < ast_node.depth) {
	    to_pre_p[i].connect_to(to_pre_not_susp, net.FAN.STD);
	 } else {
	    let and = net.make_and(ast_node, type,
				   this.name + "_to_pre_q_and_susp");

	    to_pre_p[i].connect_to(and, net.FAN.STD);
	    susp.connect_to(and, net.FAN.NEG);
	    and.connect_to(to_pre_not_susp, net.FAN.STD);
	 }
      }

      /* pre AND susp */
      this.pre_reg.connect_to(pre_and_susp, net.FAN.STD);
      susp.connect_to(pre_and_susp, net.FAN.STD);

      /* topre_not_susp OR pre_and_susp */
      pre_and_susp.connect_to(or_to_pre, net.FAN.STD);
      to_pre_not_susp.connect_to(or_to_pre, net.FAN.STD);
      or_to_pre.connect_to(this.pre_reg, net.FAN.STD);
   } else {
      /* On global signal, there is only one incarnation, and pre depends
	 only of this incarnation */
      let signal_gate = net.make_or(ast_node, type, this.name);

      this.gate_list[0] = signal_gate;
      signal_gate.connect_to(this.pre_reg, net.FAN.STD);

      /* Check there is no bug here. This test can be disabled on the future */
      if (k1_list || kill_list || susp)
	 throw new error.InternalError("Signal context", ast_node.loc);
   }
}

exports.Signal = Signal;

Signal.prototype.reset = function(reset_machine) {
   this.set_by_host = false;
}

function ValuedSignal(ast_node, type, k1_list, kill_list, susp) {
   Signal.call(this, ast_node, type, k1_list, kill_list, susp);
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
