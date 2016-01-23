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
      throw new commons.InternalError("`waiting` < 0", this.ast.loc);
   return this.waiting == 0;
}

Net.prototype.set_state = function(state) {
   this.state = state;
}

/* When the interpreter select a known net, it call the power method of the net
   to propage the state */

Net.prototype.power = function(known_list) {
   this.action();
   for (var i in this.fanout) {
      let net this.fanout[i].net;
      let propage_state = this.fanout[i].neg ? this.state : !this.state;

      if (net.is_known(propage_state))
	 known_list.push(net);
   }
}

/* Use to make side effects (set value to a signal, call an atom function, etc).
   It is called juste before propagate state */
Net.prototype.action = function() {}

function LogicalDoor(ast, fanin, fanout, neutral) {
   Net.call(this, ast, fanin, fanout);
   this.neutral = neutral;
}

LogicalDoor.prototype = new Net(undefined, undefined, undefined);

exports.LogicalDoor = LogicalDoor

LogicalDoor.prototype.reset_state = function(reset_machine) {
   this.state = neutral;
}

LogicalDoor.prototype.set_state(state) {
   if (this.state == this.neutral)
      this.state = state;
}

function Register(ast, fanin, fanout) {
   Net.call(this, ast, fanin, fanout);
}

Register.prototype = new Net(undefined, undefined, undefined);

exports.Register = Register;

Register.prototype.reset_state(reset_machine) {
   if (reset_machine)
      this.state = false;
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
