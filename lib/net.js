"use hopscript"

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
      throw new InternalError("`wainting` < 0", this.ast.loc);
   else if (this.waiting == 0)
      for (var i in this.fanout)
	 this.fanout[i].net.power(this.push_value())
}

Net.prototype.push_value = function() {
   throw new InternalError("`push_value` must be implemented", this,ast.loc);
}

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

LogicalDoor.prototype.push_value = function() {
   return this.state;
}

LogicalDoor.prototype.power(state) {
   this.state = state;
   Net.prototype.power.call(this, state);
}

function Register(ast, fanin, fanout) {
   Net.call(this, ast, fanin, fanout);
   this.value;
   this.reset(true);
   if (this.waiting > 1)
      throw new InternalError("register wait for more than 1 net",
			      this.ast.loc);
}

Register.prototype = new Net(undefined, undefined, undefined);

exports.Register = Register;

Register.prototype.power = function(state) {
   this.value = state;
   Net.prototype.power.call(this, state);
}

Register.prototype.reset(flag) {
   Net.prototype.reset.call(this, flag);
   if (flag)
      this.value = false;
}

function Atom(ast, fanin, fanout) {
   Net.call(this, ast, fanin, fanout)
}

Atom.prototype = new Net(undefined, undefined, undefined);

exports.Atom = Atom;

function Signal(ast, fanin, fanout) {
   Net.call(this, ast, fanin, fanout);
}

Signal.prototype = new Net(undefined, undefined, undefined);
