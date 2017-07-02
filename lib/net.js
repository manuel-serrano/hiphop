"use strict"
"use hopscript"

const st = require("./inheritance.js");
const lang = require("./lang.js");
const error = require("./error.js");
const compiler = require("./compiler.js");
const signal = require("./signal.js");

//
// Tyoe of fanin/fanout connection
//
const FAN = { STD: 1,
	      NEG: 2,
	      DEP: 3 }

exports.FAN = FAN;

//
// Root class hierarchy of Net, contains must of runtime net evaluation
//
function Net(ast_node, type, debug_name, lvl=0) {
   //
   // just because of JS prototype inheritance...
   //
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
   this.lvl = lvl;
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
		    this.value + "->" + value +
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

//
// RegisterNet
//
function RegisterNet(ast_node, type, debug_name, lvl=-1) {
   Net.call(this, ast_node, type, debug_name, lvl);

   this.stable_id = ast_node.instr_seq + "_" + ast_node.next_register_id++;
   //
   // If true, this register must be true after the first machine
   // reinitialization (that follow a compilation)
   //
   this.oneshot = false;
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

   if (this.oneshot) {
      this.value = true;
      this.oneshot = false;
      return;
   }

   if (reset_machine)
      this.value = false;
}

RegisterNet.prototype.apply_value = function(value, _) {
   this.value = value;
}

//
// LogicalNet
//
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

//
// ActionNet
//
function ActionNet(ast_node, type, debug_name, lvl, func, accessor_list) {
   LogicalNet.call(this, ast_node, type, debug_name, lvl, true);
   this.func = func;
   this.accessor_list = accessor_list;
   signal.runtime_signal_accessor(ast_node, accessor_list, lvl, this);
}

st.___DEFINE_INHERITANCE___(LogicalNet, ActionNet);

exports.ActionNet = ActionNet;

ActionNet.prototype.action = function(known_list) {
   LogicalNet.prototype.action.call(this, known_list);

   if (this.value)
      this.apply_func();
}

ActionNet.prototype.apply_func = function() {
   let ret;

   if (this.func) {
      ret = this.func.call(signal.generate_this(this.ast_node.machine,
						this.accessor_list,
						this.lvl));
   } else {
      //
      //  No function is provided to the ActionNet, hence, accessor
      //  list has only one element, to access to a signal
      //  (pre)presence.
      //
      let acc = this.accessor_list[0];

      if (acc.get_pre) {
	 ret = acc.signal.pre_gate.value;
      } else {
	 let sig = acc.signal;
	 let lvl = this.lvl;
	 let max_lvl = lvl > sig.ast_node.depth ? sig.ast_node.depth : lvl;
	 ret = sig.gate_list[max_lvl].value;
      }
   }

   return ret;
}

//
// TestExpressionNet
//
function TestExpressionNet(ast_node, type, debug_name, lvl, func,
			   accessor_list) {
   ActionNet.call(this, ast_node, type, debug_name, lvl, func, accessor_list);
}

st.___DEFINE_INHERITANCE___(ActionNet, TestExpressionNet);

exports.TestExpressionNet = TestExpressionNet;

TestExpressionNet.prototype.action = function(known_list) {
   LogicalNet.prototype.action.call(this, known_list);

   if (!this.value)
      return;
   this.value = !!this.apply_func();
}

//
// SignalExpressionNet
//
function SignalExpressionNet(ast_node, type, signal, debug_name, lvl) {
   ActionNet.call(this, ast_node, type, debug_name, lvl, ast_node.func,
		  ast_node.accessor_list);

   this.signal = signal;
   let max_lvl = lvl > signal.ast_node.depth ? signal.ast_node.depth : lvl;
   this.connect_to(signal.dependency_gate_list[max_lvl], FAN.DEP);
}

st.___DEFINE_INHERITANCE___(ActionNet, SignalExpressionNet);

exports.SignalExpressionNet = SignalExpressionNet;

SignalExpressionNet.prototype.action = function(known_list) {
   LogicalNet.prototype.action.call(this, known_list);

   if (this.value)
      this.signal.set_value(this.apply_func());
}

//
// Signal (re)initialization net
//
function SignalInitNet(ast_node, type, signal, debug_name, lvl, func,
		       accessor_list) {
   ActionNet.call(this, ast_node, type, debug_name, lvl, func, accessor_list);
   let max_lvl = lvl > signal.ast_node.depth ? signal.ast_node.depth : lvl;
   this.connect_to(signal.dependency_gate_list[max_lvl], FAN.DEP);
   // this.connect_to(signal.pre_gate, FAN.DEP);
}

st.___DEFINE_INHERITANCE___(ActionNet, SignalInitNet);

exports.SignalInitNet = SignalInitNet;
