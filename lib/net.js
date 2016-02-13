"use hopscript"

const error = require("./error.js");
const compiler = require("./compiler.js");

/* Tyoe of fanin/fanout connection */

const FAN = { STD: 1,
	      NEG: 2,
	      DEP: 3 }

exports.FAN = FAN;

function Net(ast_node) {
   /* just because of JS inheritance... */
   if (!ast_node)
      ast_node = {};
   else
      ast_node.machine.nets.push(this);

   this.ast_node = ast_node;
   this.fanin = [];
   this.fanout = [];
   this.machine = ast_node.machine;
   this.depth;
   this.fanin_count;
   this.dependency_count;
   this.value;
   this.reset(true);
}

Net.prototype.known_value = function() {
   return this.value == true || this.value == false;
}

Net.prototype.unknown_value = function() {
   return !this.known();
}

Net.prototype.reset = function(reset_machine) {
   this.value = -1;
   this.fanin_count = 0;
   this.dependency_count = 0;

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
   if (this.known_value())
      this.machine.known_list.push(this);
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
   net.fanin.push(new_faninout(this, type));
}
