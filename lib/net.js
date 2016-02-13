"use hopscript"

const error = require("./error.js");
const compiler = require("./compiler.js");

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
   this.fanin = [];
   this.fanout = [];
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
   this.value = -1;
   this.fanin_count = 0;
   this.dependency_count = 0;
   this.has_been_propagated = false;

   for (let i in this.fanin)
      this.fanin[i].dependency ? this.dependency_count++ : this.fanin_count++;
}

Net.prototype.propagate = function() {
   for (let i in this.fanout) {
      let fanout = this.fanout[i];
      let value = this.fanout[i].polarity ? this.value : !this.value;

      fanout.net.receive(value, fanout.dependency);
   }
}

Net.prototype.receive = function(value, from_dep) {
   if (from_dep)
      this.dependency_count--;
   else
      this.fanin_count--;

   if (this.dependency_count < 0 || this.fanin_count < 0)
      error.InternalError("Out of range fanin/dependency count.",
			  this.ast_node.loc);

   this.apply_value(value, from_dep);
   this.put_in_known_list();
}

Net.prototype.apply_value = function(value, from_dep) {
   if (!this.known_value() && !from_dep) {
      this.value = value;
   }
}

Net.prototype.put_in_known_list = function() {
   if (this.has_been_propagated)
      error.InternalError("Net has already been propagated.",
			  this.ast_node.loc);

   if (this.known_value()) {
      this.has_been_propagated = true;
      this.machine.known_list.push(this);
   }
}

Net.prototype.connect_to = function() {
   function new_faninout(net, type) {
      return { net: net,
	       polarity: type != FAN.NEG,
	       dependency: type == FAN.DEP }
   }

   if (type < FAN.STD || type > FAN.DEP)
      error.InternalError("Out of range fan connection type.",
			  this.ast_node.loc);

   this.fanout.push(new_faninout(net, type));
   net.add_fanin(new_faninout(this, type));
}

Net.prototype.add_fanin = function(fanin) {
   this.fanin.push(fanin);
}

/* RegisterNet */

function RegisterNet(ast_node, debug_name) {
   Net.call(this, ast_node, debug_name);
}

RegisterNet.prototype = new Net(undefined, undefined);

exports.RegisterNet = RegisterNet;

RegisterNet.prototype.put_in_known_list = function() {}

RegisterNet.prototype.add_fanin = function(fanin) {
   if (this.fanin_list.length == 1)
      error.InternalError("Register can't have more than 1 fanin.",
			  this.ast_node.loc);
   if (fanin.dependency)
      error.InternalError("Register can't have dependency fanin.",
			  this.ast_node.loc);
   Net.prototype.add_fanin.call(this, fanin);
}

/* LogicalNet */

/* ActionNet */

/* ExpressionNet */

/* TestExpressionNet */

/* SignalExpressionNet */
