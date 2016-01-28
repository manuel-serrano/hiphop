"use hopscript"

const error = require("./error.js");
const compiler = require("./compiler.js");

const CONNECT = { STATE: 1,
		  NEG_STATE: 2,
		  ALWAYS_TRUE: 3 }

exports.CONNECT = CONNECT;

/* The Plug is used to connect a fanout to a fanin. It is usefull to know
   the type of connection it must be (just the state of the signal, or the
   negation of the signal, or always true signal. See `CONNECT` */

function Plug(net, type) {
   this.net = net;
   this.type = type;
}

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
   this.incarnation = ast_node.incarnation;
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
      throw new error.InternalError("`waiting` < 0 in " + this.ast_node.name,
				    this.ast_node.loc);
   return this.waiting == 0;
}

Net.prototype.set_state = function(state) {
   this.state = state;
}

/* When the interpreter select a known net, it call the power method of the net
   to propage the state */

Net.prototype.power = function() {
   this.action();
   for (var i in this.fanout) {
      let net = this.fanout[i].net;
      let propage_state;

      switch (this.fanout[i].neg) {
      case CONNECT.STATE:
	 propage_state = this.state;
	 break;
      case CONNECT.NEG_STATE:
	 propage_state = !this.state;
	 break;
      case CONNECT.ALWAYS_TRUE:
	 propage_state = true;
	 break;
      default:
	 throw new error.InternalError("Unkown type of plug",
				       this.ast_node.loc);
      }

      if (net.is_known(propage_state))
	 this.machine.known_nets.push(net);
   }
}

/* Use to make side effects (set value to a signal, call an atom function, etc).
   It is called juste before propagate state */

Net.prototype.action = function() {}

Net.prototype.connect_to = function(net, type) {
   this.fanout.push(new Plug(net, type));
   net.fanin.push(this);
}

exports.Net = Net;

function LogicalDoor(ast_node, neutral, neg) {
   Net.call(this, ast_node);
   this.neutral = neutral;
   this.neg = neg;
}

LogicalDoor.prototype = new Net(undefined);
LogicalDoor.prototype.constructor = LogicalDoor;

exports.LogicalDoor = LogicalDoor;

LogicalDoor.prototype.reset_state = function(reset_machine) {
   this.state = this.neutral;
}

LogicalDoor.prototype.set_state = function(state) {
   if (this.state == this.neutral)
      this.state = state;
}

LogicalDoor.prototype.action = function() {
   if (this.neg)
      this.state = !this.state;
}

exports.make_or = function(ast_node) {
   return new LogicalDoor(ast_node, false, false);
}

exports.make_and = function(ast_node) {
   return new LogicalDoor(ast_node, true, false);
}

exports.make_nor = function(ast_node) {
   return new LogicalDoor(ast_node, false, true);
}

function Register(ast_node) {
   Net.call(this, ast_node);
   if (this.machine)
      this.machine.registers.push(this);
}

Register.prototype = new Net(undefined);
Register.prototype.constructor = Register;

exports.Register = Register;

Register.prototype.reset_state = function(reset_machine) {
   if (reset_machine)
      this.state = false;
}

Register.prototype.reset = function(reset_machine) {
   Net.prototype.reset.call(this, reset_machine);
   this.waiting++;
}

function Atom(ast_node) {
   Net.call(this, ast_node)
   this.func = ast_node.func;
   this.args = ast_node.exprs;
}

Atom.prototype = new Net(undefined);

exports.Atom = Atom;

Atom.prototype.action = function() {
   if (this.state && this.waiting == 0)
      this.func.apply(null, get_runtime_args(this));
}

function Emit(ast_node, sig) {
   Net.call(this, ast_node);
   this.signal = sig;
   this.func = ast_node.func;
   this.args = ast_node.exprs;
}

Emit.prototype = new Net(undefined);
Emit.prototype.constructor = Emit;

exports.Emit = Emit;

Emit.prototype.reset = function(reset_machine) {
   Net.prototype.reset.call(this, reset_machine);

   /* called on instantiation of Emit,
      and it didn't get the signal object yet */
   if (this.signal)
      this.signal.reset(reset_machine);
}

Emit.prototype.action = function() {
   if (!this.state)
      return;

   if (this.func || this.args.length > 0)
      this.signal.set_value(get_runtime_value(this));;
}

function get_runtime_value(stmt) {
   var runtime_args = get_runtime_args(stmt);
   var value;

   if (stmt.func)
      value = stmt.func.apply(null, runtime_args);
   else
      value = runtime_args[0]
   return value;
}

function get_runtime_args(stmt) {
   var runtime_args = [];

   for (var i in stmt.args) {
      if (stmt.args[i] instanceof SignalAccessor) {
	 let accessor = stmt.args[i];
	 let sig = compiler.get_signal(stmt.ast_node,
				       accessor.signal_name);

	 if (accessor.get_value) {
	    if (accessor.get_pre)
	       runtime_args.push(sig.pre_value)
	    else {
	       if (!sig.initialized)
		  throw new error.SignalError("Not initialized",
					      sig.name,
					      stmt.ast_node.loc)
	       runtime_args.push(sig.value)
	    }
	 } else {
	    if (accessor.get_pre)
	       runtime_args.push(sig.pre_state)
	    else
	       runtime_args.push(sig.state)
	 }
      } else {
	 runtime_args.push(stmt.args[i]);
      }
   }
   return runtime_args;
}

function Signal(ast_node, name, input) {
   Net.call(this, ast_node);
   this.name = name;
   this.pre_state;
   this.reset(true);

   /* If a signal is an input signal, we add a register on it that we'll
      plug on every signal test. It allow to known if the signal is set
      by the global environment before the reaction */
   if (input)
      this.input = new Register(ast_node);
}

Signal.prototype = new Net(undefined);

exports.Signal = Signal;

Signal.prototype.is_known = function(state) {
   if (state)
      this.state = state;
}

/* Use to set an input signal from the environment between two reactions */

Signal.prototype.env_set = function() {
   if (this.input)
      this.input.state = true;
   else
      throw new error.SignalError("Can't call `env_set` on non InputSignal",
				  this.name,
				  this.ast_node.loc);
}

Signal.prototype.reset = function(reset_machine) {
   Net.prototype.reset.call(this, reset_machine);

   if (reset_machine)
      this.pre_state = false;

   /* The `input` register for InputSignal will be reseted as well if
      `reset_machine` is set because it is known as register by the machine */
}

function ValuedSignal(ast_node, name, input, combine_with, init_value, type) {
   Signal.call(this, ast_node, name, input);
   this.combine_with = combine_with;
   this.init_value = init_value;
   this.type = type;
   this.initialized;
   this.value;
   this.pre_value;
}

ValuedSignal.prototype = new Signal(undefined, undefined, undefined);

exports.ValuedSignal = ValuedSignal;

ValuedSignal.prototype.set_value = function(value) {
   if (this.state && !this.combine_with)
      throw new error.SignalError("Can't set multiple values on single signal",
				  this.name, this.ast_node.loc);

   if (!this.state && this.conbine_with)
      value = this.combine_with.call(null, this.value, value);

   this.value = value;
   this.initialized = true;
}

ValuedSignal.prototype.env_set_value = function(value) {
   Signal.prototype.set.call(this);
   this.set_value(value);
}

/* Note that `reset_machine` flag is not only use to when reset the machine,
   but also to get a brand new fresh signal in case of reincarnation */

ValuedSignal.prototype.reset = function(reset_machine) {
   Signal.prototype.reset.call(this, reset_machine);
   if (reset_machine) {
      this.value = this.init_value;
      this.pre_value = this.value;
      this.initialized = this.init_value ? true : false;
   } else {
      this.pre_value = this.value;
      if (this.pre_value instanceof Object)
      	 Object.freeze(this.pre_value);
   }


}
