"use hopscript"

function HipHopError(name, msg, loc) {
   this.message = "*** " + name;
   if (loc)
      this.message += "\n*** " + loc
   if (msg)
      this.message += "\n*** " + msg
   this.stack = (new Error().stack);
}

HipHopError.prototype = new Error();

function InternalError(msg, loc) {
   HipHopError.call(this, "INTERNAL ERROR", msg, loc);
}

InternalError.prototype = new HipHopError(undefined, undefined, undefined);

exports.InternalError = InternalError;

function CausalityError(n_miss) {
   HipHopError.call(this, "CAUSALITY ERROR", "missing " + n_miss + " nets",
		    undefined);
}

CausalityError.prototype = new HipHopError(undefined, undefined, undefined);

exports.CausalityError = CausalityError;

function SignalError(msg, signal_name, loc) {
   HipHopError.call(this, "SIGNAL ERROR on signal `" + signal_name + "`",
		    msg, loc);
}

SignalError.prototype = new HipHopError(undefined, undefined, undefined);

exports.SignalError = SignalError;

function SyntaxError(msg, loc) {
   HipHopError.call(this, "SYNTAX ERROR", msg, loc);
}

SyntaxError.prototype = new HipHopError(undefined, undefined, undefined);

exports.SyntaxError = SyntaxError;

function TypeError(expected, given, loc) {
   HipHopError.call(this, "TYPE ERROR", "expected:" + expected + " given:"
		    + given, loc);
}

TypeError.prototype = new HipHopError(undefined, undefined, undefined);

exports.TypeError = TypeError;

function MachineError(name, msg) {
   HipHopError.call(this, "REACTIVE MACHIME ERROR", name + ": " + msg,
		    undefined);
}

MachineError.prototype = new HipHopError(undefined, undefined, undefined);

exports.MachineError = MachineError;
