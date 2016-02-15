"use hopscript"

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

function Net(ast_node, debug_name) {
   /* just because of JS prototype inheritance... */
   if (!ast_node)
      ast_node = {};
   else
      ast_node.machine.nets.push(this);

   this.debug_name = debug_name;
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

Net.prototype.propagate = function() {
   for (let i in this.fanout) {
      let fanout = this.fanout_list[i];
      let value = fanout.polarity ? this.value : !this.value;

      fanout.net.receive(value, fanout.dependency);
   }
}

Net.prototype.receive = function(value, from_dep) {
   if (from_dep)
      this.dependency_count--;
   else
      this.fanin_count--;

   if (this.dependency_count < 0 || this.fanin_count < 0)
      throw new error.InternalError("Out of range fanin/dependency count.",
				    this.ast_node.loc);

   if (this.has_been_propagated)
      return;

   this.apply_value(value, from_dep);
   if (this.known_value() && this.dependency_count == 0) {
      this.has_been_propagated = true;
      this.action();
   }
}

Net.prototype.apply_value = function(value, from_dep) {
   if (!this.known_value() && !from_dep) {
      this.value = value;
   }
}

Net.prototype.action = function() {
   this.machine.known_list.push(this);
}

Net.prototype.connect_to = function() {
   function new_faninout(net, type) {
      return { net: net,
	       polarity: type != FAN.NEG,
	       dependency: type == FAN.DEP }
   }

   if (type < FAN.STD || type > FAN.DEP)
      throw new error.InternalError("Out of range fan connection type.",
				    this.ast_node.loc);

   this.fanout_list.push(new_faninout(net, type));
   net.add_fanin(new_faninout(this, type));
}

Net.prototype.add_fanin = function(fanin) {
   this.fanin_list.push(fanin);
}

/* RegisterNet */

function RegisterNet(ast_node, debug_name) {
   Net.call(this, ast_node, debug_name);
}

RegisterNet.prototype = new Net(undefined, undefined);

exports.RegisterNet = RegisterNet;

RegisterNet.prototype.action = function() {}

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

/* LogicalNet */

function LogicalNet(ast_node, debug_name, neutral) {
   Net.call(this, ast_node, debug_name);

   if (neutral != undefined && neutral != true && neutral != false)
      throw new error.InternalError("`neutral` must be a boolean.",
				    this.ast_node.loc);
   this.neutral = neutral;
}

LogicalNet.prototype = new Net(undefined, undefined);

Logicalnet.prototype.apply_value = function(value, from_dep) {
   if (!from_dep && (this.fanin_count == 0 || this.neutral != value))
      Net.prototype.apply_value.call(this, value, from_dep);
}

LogicalNet.prototype.reset = function(reset_machine) {
   Net.prototype.reset.call(this, reset_machine);

   this.value = this.neutral;
}

exports.make_or = function(ast_node, debug_name) {
   return new LogicalNet(ast_node, debug_name, false);
}

exports.make_and = function(ast_node, debug_name) {
   return new LogicalNet(ast_node, debug_name, true);
}

/* ActionNet */

function ActionNet(ast_node, debug_name, func, args) {
   LogicalNet.call(this, ast_node, debug_name, true);

   if (!(args instanceof Array))
      throw new error.InternalError("`args` must be defined with a JS array.",
				    this.ast_node.loc);
   this.func = func;
   this.args = args;
}

ActionNet.prototype = new LogicalNet(undefined, undefined, undefined);

ActionNet.prototype.action = function(value, from_dep) {
   LogicalNet.prototype.action.call(this);

   this.apply_func();
}

ActionNet.prototype.apply_func = function() {
   var runtime_args = get_runtime_args(this);
   var value;

   if (this.func)
      value = this.func.apply(null, runtime_args);
   else
      value = runtime_args[0]
   return value;
}

ActionNet.prototype.get_runtime_args = function() {
   var runtime_args = [];

   for (var i in this.args) {
      if (this.args[i] instanceof lang.SignalAccessor) {
	 let accessor = this.args[i];
	 let sig = get_signal(this.ast_node, accessor.signal_name);

	 if (accessor.get_value) {
	    if (accessor.get_pre)
	       runtime_args.push(sig.pre_value)
	    else {
	       if (!sig.initialized)
		  throw new error.SignalError("Not initialized",
					      sig.name,
					      this.ast_node.loc)
	       runtime_args.push(sig.value)
	    }
	 } else {
	    if (accessor.get_pre)
	       runtime_args.push(sig.pre_state)
	    else
	       runtime_args.push(sig.state)
	 }
      } else {
	 runtime_args.push(this.args[i]);
      }
   }
   return runtime_args;
}

/* TestExpressionNet */

function TestExpressionNet(ast_node, debug_name, func, args) {
   ActionNet.call(this, ast_node, debug_name, func, args);
}

TestExpressionNet.prototype = new ActionNet(undefined, undefined, undefined,
					    undefined);

TestExpressionNet.prototype.action = function(value, from_dep) {
   LogicalNet.prototype.action.call(this);

   let bool_value = this.apply_func();

   if (bool_value != true && bool_value != false)
      throw new error.TypeError("Test expression get a non boolean value.",
				this.ast_node.loc);
   this.value = bool_value;
}

/* SignalExpressionNet */

function SignalExpressionNet(ast_node, debug_name, func, args, signal) {
   ActionNet.call(this, ast_node, debug_name, func, args);

   if (!(signal instanceof signal.ValuedSignal))
      throw new error.InternalError("`signal` must be s ValuedSignal.",
				    this,ast_node.loc);
   this.signal = signal;
}

SignalExpressionNet.prototype = new ActionNet(undefined, undefined, undefined,
					      undefined);

SignalExpressionNet.prototype.action = function(value, from_dep) {
   LogicalNet.prototype.action.call(this);

   signal.set_value(this.apply_func());
}
