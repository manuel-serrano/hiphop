"use hopscript"

function InternalError(msg, loc) {
   return "*** INTERNAL ERROR at " + loc + "\n" + "*** " + msg;
}

exports.InternalError = InternalError;
