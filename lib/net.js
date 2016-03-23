"use strict"
"use hopscript"

const st = require("./inheritance.js");
const lang = require("./lang.js");
const error = require("./error.js");
const compiler = require("./compiler.js");
const signal = require("./signal.js");

/* Tyoe of fanin/fanout connection */

const FAN = { STD: 1,
	      NEG: 2,
	      DEP: 3 }

exports.FAN = FAN;

/* Root class hierarchy of Net, contains must of runtime net evaluation */

function Net(ast_node, type, debug_name, lvl=-1) {
   /* just because of JS prototype inheritance... */
   if (!ast_node) {
      ast_node = {};
   } else {
      ast_node.machine.nets.push(this);
      ast_node.net_list.push(this);
      this.debug_name = ast_node.constructor.name + "___";
      if (!(ast_node instanceof type))
	 this.debug_name += type.name + "___";
      this.debug_name += debug_name;
      if (lvl > -1)
	 this.debug_name += "___" + lvl;
   }

   this.ast_node = ast_node;
   this.fanin_list = [];
   this.fanout_list = [];
   this.machine = ast_node.machine;
   this.depth;
   this.fanin_count;
   this.dependency_count;
   this.value;
   this.has_been_propagated;
   this.reset(true);
}

Net.prototype.known_value = function() {
   return this.value == true || this.value == false;
}

Net.prototype.unknown_value = function() {
   return !this.known_value();
}

Net.prototype.reset = function(reset_machine) {
   this.fanin_count = 0;
   this.dependency_count = 0;
   this.has_been_propagated = false;

   for (let i in this.fanin_list)
      this.fanin_list[i].dependency
      ? this.dependency_count++
      : this.fanin_count++;
}

Net.prototype.propagate = function(known_list) {
   if (this.machine.trace_on == 2)
      console.error("propagate", this.debug_name, " value:" + this.value +
		    " loc:" + this.ast_node.loc.split(":")[1]);

   for (let i in this.fanout_list) {
      let fanout = this.fanout_list[i];
      let value = fanout.polarity ? this.value : !this.value;

      fanout.net.receive(known_list, value, fanout.dependency);
   }
}

Net.prototype.receive = function(known_list, value, from_dep) {
   if (this.machine.trace_on == 2)
      console.error("     receive(" +
		    (this.fanin_list.length + 1 -
		     (this.dependency_count + this.fanin_count)) +
		    "/" + this.fanin_list.length + ", " +
		    value + ", " + from_dep + ") " +
		    this.constructor.name + " " +
		    this.debug_name + " " +
		    this.value +
		    " loc:" + this.ast_node.loc.split(":")[1])

   if (from_dep)
      this.dependency_count--;
   else
      this.fanin_count--;

   if (this.dependency_count < 0 || this.fanin_count < 0)
      throw new error.InternalError("Out of range fanin/dependency count." +
				    " [" + this.fanin_count + " " +
				    this.dependency_count + " " +
				    this.fanin_list.length +"]",
				    this.ast_node.loc);

   if (this.has_been_propagated)
      return;

   this.apply_value(value, from_dep);
   if (this.known_value() && this.dependency_count == 0) {
      this.has_been_propagated = true;
      this.action(known_list);
   }
}

Net.prototype.apply_value = function(value, from_dep) {
   throw new error.InternetError("`apply_value` must be implemented.",
				 this.ast_node.loc);
}

Net.prototype.action = function(known_list) {
   known_list.push(this);
}

Net.prototype.connect_to = function(net, type) {
   function new_faninout(net, type) {
      return { net: net,
	       polarity: type != FAN.NEG,
	       dependency: type == FAN.DEP }
   }

   if (type < FAN.STD || type > FAN.DEP)
      throw new error.InternalError("Out of range fan connection type.",
				    this.ast_node.loc);

   if (!net)
      throw new error.InternalError(this.debug_name + " connect `net` but " +
   				    "it is undefined", this.ast_node.loc);
   this.fanout_list.push(new_faninout(net, type));
   net.add_fanin(new_faninout(this, type));
}

Net.prototype.add_fanin = function(fanin) {
   this.fanin_list.push(fanin);
}

function _remove_net(list, net) {
   for (let i in list)
      if (list[i].net == net) {
	 list.splice(i, 1);
	 return true;
      }

   return false;
}

Net.prototype.remove_in_net = function(in_net) {
   if (!_remove_net(this.fanin_list, in_net))
      throw new error.InternalError("Can't remove `in_net`.", undefined);
}

Net.prototype.remove_out_net = function(out_net) {
   if (!_remove_net(this.fanout_list, out_net))
      throw new error.InternalError("Can't remove `out_net`.", undefined);
}

/* RegisterNet */

function RegisterNet(ast_node, type, debug_name, lvl=-1) {
   Net.call(this, ast_node, type, debug_name, lvl);

   if (!ast_node.register_list)
      ast_node.register_list = [];
   ast_node.register_list.push(this);
   this.stable_id = ast_node.instr_seq + "_" + ast_node.next_register_id++;
}

st.___DEFINE_INHERITANCE___(Net, RegisterNet);

exports.RegisterNet = RegisterNet;

RegisterNet.prototype.action = function(known_list) {}

RegisterNet.prototype.add_fanin = function(fanin) {
   if (this.fanin_list.length == 1)
      throw new error.InternalError("Register can't have more than 1 fanin.",
				    this.ast_node.loc);
   if (fanin.dependency)
      throw new error.InternalError("Register can't have dependency fanin.",
				    this.ast_node.loc);
   Net.prototype.add_fanin.call(this, fanin);
}

RegisterNet.prototype.reset = function(reset_machine) {
   Net.prototype.reset.call(this, reset_machine);

   if (reset_machine)
      this.value = false;
}

RegisterNet.prototype.apply_value = function(value, from_dep) {
   this.value = value;
}

/* LogicalNet */

function LogicalNet(ast_node, type, debug_name, lvl, neutral) {
   Net.call(this, ast_node, type, debug_name, lvl);

   if (neutral != undefined && neutral != true && neutral != false)
      throw new error.InternalError("`neutral` must be a boolean.",
				    this.ast_node.loc);
   this.neutral = neutral;
}

st.___DEFINE_INHERITANCE___(Net, LogicalNet);

exports.LogicalNet = LogicalNet;

LogicalNet.prototype.apply_value = function(value, from_dep) {
   if (!from_dep && (this.fanin_count == 0 || this.neutral != value))
      this.value = value;
   else if (from_dep && this.unknown_value() &&
	    this.fanin_count == 0 && this.dependency_count == 0)
      this.value = false;
}

LogicalNet.prototype.reset = function(reset_machine) {
   Net.prototype.reset.call(this, reset_machine);

   if (this.fanin_list.length == 0)
      this.value = this.neutral;
   else
      this.value = -1;
}

exports.make_or = function(ast_node, type, debug_name, lvl=-1) {
   return new LogicalNet(ast_node, type, debug_name, lvl, false);
}

exports.make_and = function(ast_node, type, debug_name, lvl=-1) {
   return new LogicalNet(ast_node, type, debug_name, lvl, true);
}

/* ActionNet */

function ActionNet(ast_node, type, debug_name, lvl, func, args_list) {
   LogicalNet.call(this, ast_node, type, debug_name, lvl, true);

   if (!(args_list instanceof Array))
      throw new error.InternalError("`args` must be defined with a JS array.",
				    this.ast_node.loc);
   this.func = func;
   this.args_list = [];

   /* replace SignalAccessor by gate or signal objects, and add
      depdency on this which is the net which use this expression */
   for (let i in args_list) {
      let arg = args_list[i];

      if (arg instanceof lang.SignalAccessor) {
	 let gate = null;

	 if (arg.get_value) {
	    let sobj = compiler.get_signal_object(ast_node.machine,
						  arg.signal_name);

	    this.args_list.push({ pre: arg.get_pre, signal: sobj});
	    gate = arg.get_pre ? sobj.pre_gate : sobj.dependency_gate;
	 } else {
	    if (arg.get_pre)
	       gate = compiler.get_signal_pre_gate(ast_node.machine,
						   arg.signal_name)
	    else
	       gate = compiler.get_signal_gate(ast_node.machine,
					       arg.signal_name, lvl)
	    this.args_list.push(gate);
	 }

	 gate.connect_to(this, FAN.DEP);
      } else {
	 this.args_list.push(arg);
      }
   }
}

st.___DEFINE_INHERITANCE___(LogicalNet, ActionNet);

exports.ActionNet = ActionNet;

ActionNet.prototype.action = function(known_list) {
   LogicalNet.prototype.action.call(this, known_list);

   if (this.value)
      this.apply_func();
}

ActionNet.prototype.apply_func = function() {
   let runtime_args = this.get_runtime_args();
   let value;

   if (this.func)
      value = this.func.apply(null, runtime_args)
   else
      value = runtime_args[0]
   return value;
}

ActionNet.prototype.get_runtime_args = function() {
   function get_value(self, el) {
      if (el instanceof LogicalNet) {
	 /* el is a signal gate, for a signal (pre) presence test */
	 return el.value;
      } else if (el.signal && el.signal instanceof signal.ValuedSignal) {
	 /* el is a wrapper telling that we want to access to the (pre)
	    value of a valued signal */
	 if (el.pre)
	    return el.signal.pre_value
	 else if (el.signal.initialized)
	    return el.signal.value;
	 throw new error.SignalError("Can't get value of a non initialized " +
				     "signal.", el.signal.name,
				     self.ast_node.loc);
      } else {
	 /* el is any other object that we can directly return */
	 return el;
      }
   }

   let runtime_args = [];

   for (let i in this.args_list)
      runtime_args.push(get_value(this, this.args_list[i]));

   return runtime_args;
}

/* TestExpressionNet */

function TestExpressionNet(ast_node, type, debug_name, lvl, func, args_list) {
   ActionNet.call(this, ast_node, type, debug_name, lvl, func, args_list);
}

st.___DEFINE_INHERITANCE___(ActionNet, TestExpressionNet);

exports.TestExpressionNet = TestExpressionNet;

TestExpressionNet.prototype.action = function(known_list) {
   LogicalNet.prototype.action.call(this, known_list);

   if (!this.value)
      return;
   this.value = !!this.apply_func();
}

/* SignalExpressionNet */

function SignalExpressionNet(ast_node, type, debug_name, lvl) {
   ActionNet.call(this, ast_node, type, debug_name, lvl, ast_node.func,
		  ast_node.args_list);
   this.signal = compiler.get_signal_object(ast_node.machine,
					    ast_node.signal_name);

   if (!(this.signal instanceof signal.ValuedSignal))
      throw new error.InternalError("`this.signal` must be a ValuedSignal.",
				    this.ast_node.loc);
   this.connect_to(this.signal.dependency_gate, FAN.DEP);
}

st.___DEFINE_INHERITANCE___(ActionNet, SignalExpressionNet);

exports.SignalExpressionNet = SignalExpressionNet;

SignalExpressionNet.prototype.action = function(known_list) {
   LogicalNet.prototype.action.call(this, known_list);

   if (this.value)
      this.signal.set_value(this.apply_func());
}
