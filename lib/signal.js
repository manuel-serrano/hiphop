"use hopscript"

var error = require("./error.js");

exports.Signal = null;

exports.ValuedSignal = null;

function SignalAccessor(signal, get_pre, get_value) {
   this.signal = signal;
   this.get_pre = get_pre;
   this.get_value = get_value;
}

exports.SignalAccessor = SignalAccessor;

SignalAccessor.prototype.get = function(incarnation) {
   throw error.InternalError("NYI", "SignalAccessor");
}
