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
   ast_node.machine.nets.push(this);
   ast_node.net_list.push(this);
   this.debug_name = ast_node.constructor.name + "___";
   if (!(ast_node instanceof type))
      this.debug_name += type.name + "___";
   this.debug_name += debug_name;
   if (lvl > -1)
      this.debug_name += "___" + lvl;

   this.ast_node = ast_node;
   this.fanin_list = [];
   this.fanout_list = [];
   this.machine = ast_node.machine;
   this.lvl = lvl;
   this.faninCount;
   this.dependencyCount;
   this.value;
}

Net.prototype.knownValue = function() {
   return this.value === true || this.value === false;
}

Net.prototype.reset = function(reset_machine) {
   this.faninCount = 0;
   this.dependencyCount = 0;
   this.fanin_list.forEach(fanin => {
      if (fanin.dependency) {
	 this.dependencyCount++;
      } else {
	 this.faninCount++;
      }
   });
}

Net.prototype.propagate = function(knownList) {
   if (this.machine.tracePropagation) {
      console.error(`propagate ${this.debug_name} value:${this.value} loc:${this.ast_node.loc.split(":")[1]}`);
   }

   this.fanout_list.forEach(fanout => {
      let value = fanout.polarity ? this.value : !this.value;
      if (fanout.net.receive(value, fanout.dependency)) {
	 knownList.push(fanout.net);
      }
   });
}

Net.prototype.hasBeenPropagated = function() {
   throw new error.InternalError("hasBeenPropagated must be implemented");
}

Net.prototype.receive = function(_1, _2) {
   throw new error.InternalError("receive must be implemented");
}

Net.prototype.connect_to = function(net, type) {
   function makeFan(net, type) {
      return { net: net,
	       polarity: type != FAN.NEG,
	       dependency: type == FAN.DEP,
	       antagonist: null }
   }

   if (type < FAN.STD || type > FAN.DEP)
      throw new error.InternalError("Out of range fan connection type.",
				    this.ast_node.loc);

   if (!net)
      throw new error.InternalError(this.debug_name + " connect `net` but " +
   				    "it is undefined", this.ast_node.loc);

   if (net instanceof RegisterNet) {
      if (net.fanin_list.length == 1)
	 throw new error.InternalError("Register can't have more than 1 fanin.",
				       net.ast_node.loc);
      if (type == FAN.DEP)
	 throw new error.InternalError("Register can't have dependency fanin.",
				       net.ast_node.loc);
   }

   let fanout = makeFan(net, type);
   let fanin = makeFan(this, type);
   fanout.antagonist = fanin;
   fanin.antagonist = fanout;
   this.fanout_list.push(fanout);
   net.fanin_list.push(fanin);
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
   this.noSweep = true;
}

st.___DEFINE_INHERITANCE___(Net, RegisterNet);

exports.RegisterNet = RegisterNet;

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

RegisterNet.prototype.hasBeenPropagated = function() {
   return this.faninCount == 0;
}

RegisterNet.prototype.receive = function(value, _) {
   if (this.machine.tracePropagation) {
      console.error(`     receive ${this.debug_name} value:${value}`);
   }
   this.faninCount--;

   if (this.faninCount < 0) {
      throw new error.InternalError("Out of range Register.faninCount");
   }
   this.value = value;
   return false;
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

LogicalNet.prototype.hasBeenPropagated = function () {
   return this.knownValue() && this.dependencyCount == 0;
}

LogicalNet.prototype.receive = function(value, fromDep) {
   let terminateEarly = false;

   if (this.machine.tracePropagation) {
      console.error("     receive " + this.debug_name + " " +
		    (this.fanin_list.length + 1 -
		     (this.dependencyCount + this.faninCount)) +
		    "/" + this.fanin_list.length + " value:" +
		    value + " dep:" + fromDep +
		    " loc:" + this.ast_node.loc.split(":")[1]);
      console.error("             value-before:" + this.value);
   }

   if (this.hasBeenPropagated()) {
      if (this.machine.tracePropagation) {
	 console.error("             value-after:" + this.value,
		       "[PREVIOUSLY PROPAGATED]");
      }
      //
      // Don't return here in order to decrement and to check
      // counters. This is usefull only for debugging and logging.
      //
      terminateEarly = true;
   }

   if (fromDep) {
      this.dependencyCount--;
   } else {
      this.faninCount--;
   }

   if (this.dependencyCount < 0 || this.faninCount < 0) {
      throw new error.InternalError("Out of range fanin/dependency count." +
				    " [" + this.faninCount + " " +
				    this.dependencyCount + " " +
				    this.fanin_list.length + "]",
				    this.ast_node.loc);
   }

   if (terminateEarly) {
      return false;
   }

   if (value != this.neutral && !fromDep) {
      this.value = value;
   }

   let ret = false;
   if (this.dependencyCount == 0) {
      if (this.knownValue()) {
	 ret = true;
      } else if (this.faninCount == 0) {
	 this.value = this.neutral;
	 ret = true;
      }
   }

   if (this.machine.tracePropagation) {
      console.error("             value-after:" + this.value);
   }

   return ret;
};

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
   this.noSweep = true;
}

st.___DEFINE_INHERITANCE___(LogicalNet, ActionNet);

exports.ActionNet = ActionNet;

ActionNet.prototype.receive = function(value, fromDep) {
   if(LogicalNet.prototype.receive.call(this, value, fromDep)) {
      if (this.value === true) {
	 this.action();
      }
      return true;
   }
   return false;
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

ActionNet.prototype.action = function() {
   this.apply_func();
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

TestExpressionNet.prototype.action = function() {
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

SignalExpressionNet.prototype.action = function() {
   this.signal.set_value(this.apply_func());
}
