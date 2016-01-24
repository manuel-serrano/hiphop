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

function CausalityError() {
   HipHopError.call(this, "CAUSALITY ERROR", undefined, undefined);
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
