"use hopscript"

var error = require("./error.js");
var signal = require("./lang.js");

/* The Plug is used to connect a fanout to a fanin. It is usefull to know
   if we must sent the opposite of state (set `net` to true in this case) */

function Plug(net, neg) {
   this.net = net;
   this.neg = neg;
}

function Net(ast) {
   /* just because of JS inheritance... */
   if (!ast)
      ast = {};
   else
      ast.machine.nets.push(this);

   this.ast = ast;
   this.fanin = [];
   this.fanout = [];
   this.machine = ast.machine;
   this.incarnation = ast.incarnation;
   this.waiting;
   this.state;
   this.reset(true);
}

Net.prototype.reset = function(reset_machine) {
   this.waiting = this.fanin.length;
   this.reset_state(reset_machine);
}

Net.prototype.reset_state = function(reset_machine) {
   this.state = false;
}

/* When a net propagate it's state, it check every reachable net if it is
   known (if all fanin are set) */

Net.prototype.is_known = function(state) {
   this.set_state(state);
   this.waiting--;
   if (this.waiting < 0)
      throw new error.InternalError("`waiting` < 0", this.ast.loc);
   return this.waiting == 0;
}

Net.prototype.set_state = function(state) {
   this.state = state;
}

/* When the interpreter select a known net, it call the power method of the net
   to propage the state */

Net.prototype.power = function() {
   this.action();
   console.log("power", this.constructor.name, this.ast.name, this.ast.loc);
   for (var i in this.fanout) {
      let net = this.fanout[i].net;
      let propage_state = this.fanout[i].neg ? !this.state : this.state;

      if (net.is_known(propage_state))
	 this.machine.known_nets.push(net);
   }
}

/* Use to make side effects (set value to a signal, call an atom function, etc).
   It is called juste before propagate state */
Net.prototype.action = function() {}

Net.prototype.connect_to = function(net, neg) {
   this.fanout.push(new Plug(net, neg));
   net.fanin.push(this);
}

exports.Net = Net;

function LogicalDoor(ast, neutral) {
   Net.call(this, ast);
   this.neutral = neutral;
}

LogicalDoor.prototype = new Net(undefined);
LogicalDoor.prototype.constructor = LogicalDoor;

exports.LogicalDoor = LogicalDoor

LogicalDoor.prototype.reset_state = function(reset_machine) {
   this.state = this.neutral;
}

LogicalDoor.prototype.set_state = function(state) {
   if (this.state == this.neutral)
      this.state = state;
}

exports.makeOr = function(ast) {
   return new LogicalDoor(ast, false);
}

exports.makeAnd = function(ast) {
   return new LogicalDoor(ast, true);
}

function Register(ast) {
   Net.call(this, ast);
   if (this.machine)
      this.machine.registers.push(this);
   this.next_state = false;
}

Register.prototype = new Net(undefined);
Register.prototype.constructor = Register;

exports.Register = Register;

Register.prototype.set_state = function(state) {
   this.state = this.next_state;
   this.next_state = state;
}

Register.prototype.reset_state = function(reset_machine) {
   if (reset_machine)
      this.state = false;
}

Register.prototype.reset = function(reset_machine) {
   Net.prototype.reset.call(this, reset_machine);
   this.waiting++;
}

function Atom(ast) {
   Net.call(this, ast)
   this.callee = ast.callee;
   this.args = ast.args;
}

Atom.prototype = new Net(undefined);

exports.Atom = Atom;

Atom.prototype.action = function(state) {
   if (state && this.waiting == 0)
      this.callee.apply(null, get_runtime_args(this.args, this.incarnation));
}

function Emit(ast) {
   Net.call(this, ast);
   this.signal = ast.signal;
   this.callee = ast.callee;
   this.args = ast.args;
}

Emit.prototype = new Net(undefined);

exports.Emit = Emit

Emit.prototype.reset = function(reset_machine) {
   Net.prototype.reset.call(this, reset_machine);
   this.signal.reset(reset_machine);
}

Emit.prototype.action = function(state) {
   if (this.callee || this.args)
      this.signal.set(get_runtime_value(this.callee,
					this.args,
					this.incarnation));
   else
      this.signal.set();
}

function get_runtime_value(callee, static_args, incarnation) {
   var runtime_args = get_runtime_args(static_args, incarnation);
   var value;

   if (callee)
      value = callee.apply(null, runtime_args);
   else
      value = runtime_args[0]
   return value;
}

function get_runtime_args(static_args, incarnation) {
   var runtime_args;

   for (var i in static_args) {
      if (static_args[i] instanceof lang.SignalAccessor)
	 runtime_args.push(static_args[i].get(incarnation))
      else
	 runtime_args.push(static_args[i]);
   }
   return runtime_args;
}
