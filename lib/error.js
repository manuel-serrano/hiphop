"use hopscript"

function InternalError(msg, loc) {
   return "*** INTERNAL ERROR at " + loc + "\n" + "*** " + msg;
}

exports.InternalError = InternalError;

function CausalityError() {
   return "*** CAUSALITY ERROR";
}

exports.CausalityError = CausalityError;

function SignalError(msg, signal_name, loc) {
   return "*** SIGNAL ERROR on signal `" + signal_name + "`\n" + "*** " + msg;
}

exports.SignalError = SignalError;

function SyntaxError(msg, loc) {
   return "*** SYNTAX ERROR at " + loc + "\n" + "*** " + msg;
}

exports.SyntaxError = SyntaxError;
