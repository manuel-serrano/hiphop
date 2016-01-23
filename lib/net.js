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
   this.reset(false);
}

Net.prototype.reset = function(flag) {
   this.waiting = this.fanin.length;
}

Net.prototype.power = function(state) {
   this.waiting--;
   if (this.waiting < 0)
      throw new commons.InternalError("`wainting` < 0", this.ast.loc);
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
   this.reset(false);
}

LogicalDoor.prototype = new Net(undefined, undefined, undefined);

exports.LogicalDoor = LogicalDoor

LogicalDoor.prototype.reset = function(flag) {
   Net.prototype.reset.call(this, flag);
   this.state = neutral;
}

LogicalDoor.prototype.action(state) {
   if (this.state == this.neutral)
      this.state = state;
}

function Register(ast, fanin, fanout) {
   Net.call(this, ast, fanin, fanout);
   this.value;
   this.reset(true);
}

Register.prototype = new Net(undefined, undefined, undefined);

exports.Register = Register;

Register.prototype.reset(flag) {
   Net.prototype.reset.call(this, flag);
   if (flag)
      this.value = false;
}

Register.prototype.action(state) {
   this.value = state;
}

function Atom(ast, fanin, fanout, callee, raw_args) {
   Net.call(this, ast, fanin, fanout)
   this.callee = callee;
   this.raw_args = raw_args;
}

Atom.prototype = new Net(undefined, undefined, undefined);

exports.Atom = Atom;

Atom.prototype.action = function(state) {
   if (state && this.waiting == 0) {
      var args = [];

      for (var i in this.raw_args) {
	 if (this.raw_args[i] instanceof commons.SignalAccessor)
	    args.push(this.raw_args[i].get());
	 else
	    args.push(this.raw_args[i]);
      }
      this.callee.apply(null, args);
   }
}

function Signal(ast, fanin, fanout) {
   Net.call(this, ast, fanin, fanout);
}

Signal.prototype = new Net(undefined, undefined, undefined);
