"use hopscript"

var commons = require("./commons.js");

function Plug(net, neg) {
   this.net;
   this.neg;
}

exports.Plug = Plug;

function Net(ast, fanin, fanout) {
   this.ast = ast;
   this.fanin = fanin;
   this.fanout = fanout;
   this.waiting;
   this.reset(true);
}

Net.prototype.reset = function(reset_machine) {
   this.waiting = this.fanin.length;
}

Net.prototype.power = function(state) {
   this.waiting--;
   if (this.waiting < 0)
      throw new commons.InternalError("`waiting` < 0", this.ast.loc);
   this.action(state);
   else if (this.waiting == 0)
      for (var i in this.fanout)
	 this.fanout[i].net.power(this.state)
}

Net.prototype.action = function(state) {}

function LogicalDoor(ast, fanin, fanout, neutral) {
   Net.call(this, ast, fanin, fanout);
   this.neutral = neutral;
   this.state;
}

LogicalDoor.prototype = new Net(undefined, undefined, undefined);

exports.LogicalDoor = LogicalDoor

LogicalDoor.prototype.reset = function(reset_machine) {
   Net.prototype.reset.call(this, reset_machine);
   this.state = neutral;
}

LogicalDoor.prototype.action(state) {
   if (this.state == this.neutral)
      this.state = state;
}

function Register(ast, fanin, fanout) {
   Net.call(this, ast, fanin, fanout);
   this.value;
}

Register.prototype = new Net(undefined, undefined, undefined);

exports.Register = Register;

Register.prototype.reset(reset_machine) {
   Net.prototype.reset.call(this, reset_machine);
   if (reset_machine)
      this.value = false;
}

Register.prototype.action(state) {
   this.value = state;
}

function Atom(ast, fanin, fanout, callee, args, incarnation) {
   Net.call(this, ast, fanin, fanout)
   this.callee = callee;
   this.args = args;
   this.incarnation = incarnation;
}

Atom.prototype = new Net(undefined, undefined, undefined);

exports.Atom = Atom;

Atom.prototype.action = function(state) {
   if (state && this.waiting == 0)
      this.callee.apply(null, get_runtime_args(this.args, this.incarnation));
}

function Emit(ast, fanin, fanout, signal, callee, args, incarnation) {
   Net.call(this, ast, fanin, fanout);
   this.signal = signal;
   this.callee = callee;
   this.args = args;
   this.incarnation = incarnation;
}

Emit.prototype = new Net(undefined, undefined, undefined);

exports.Emit = Emit

Emit.prototype.reset(reset_machine) {
   Net.prototype.reset.call(this, reset_machine);
   this.signal.reset(reset_machine);
}

Emit.prototype.action = function(state) {
   if (this.callee || this.args)
      this.signal.set(get_runtime_value(this.callee,
					this.args,
					this.incarnation);
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
      if (static_args[i] instanceof commons.SignalAccessor)
	 runtime_args.push(static_args[i].get(incarnation))
      else
	 runtime_args.push(static_args[i]);
   }
   return runtime_args;
}
