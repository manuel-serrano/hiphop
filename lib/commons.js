"use hopscript"

function InternalError(msg, loc) {
   return "*** INTERNAL ERROR at " + loc + "\n" + "*** " + msg;
}

exports.InternalError = InternalError;

function SignalAccessor(signal, get_pre, get_value) {
   this.signal = signal;
   this.get_pre = get_pre;
   this.get_value = get_value;
}

exports.SignalAccessor = SignalAccessor;

SignalAccessor.prototype.get = function() {
   throw InternalError("NYI", "SignalAccessor");
}
