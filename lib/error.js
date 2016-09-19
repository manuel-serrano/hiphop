"use strict"
"use hopscript"

//
// TODO: The error mechanism is not very good. A good rewrite is necessary.
//
// A good idea should be some functions like error_syntax and
// error_runtime that trigger a JS exception
//
// error_syntax could trigger an exception only at the end of the
// compilation. Therefore, we can have all syntax error in one shot
// (and don't stop at the first one)
//

function HipHopError(name, msg, loc) {
   let message = "";

   this.message = "*** " + name;
   if (loc)
      this.message += "\n*** " + loc
   if (msg)
      this.message += "\n*** " + msg
   Error.call(this, message);
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

function RuntimeError(msg, loc) {
   HipHopError.call(this, "RUNTIME ERROR", msg, loc);
}

RuntimeError.prototype = new HipHopError(undefined, undefined, undefined);

exports.RuntimeError = RuntimeError;

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
