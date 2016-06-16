"use strict"
"use hopscript"

const machine = require("./machine.js");
const lang = require("./lang.js");
const error = require("./error.js");

exports.MODULE = lang.MODULE;
exports.LET = lang.LET;
exports.EMIT = lang.EMIT;
exports.SUSTAIN = lang.SUSTAIN;
exports.NOTHING = lang.NOTHING;
exports.PAUSE = lang.PAUSE;
exports.HALT = lang.HALT;
exports.PRESENT = lang.PRESENT;
exports.AWAIT = lang.AWAIT;
exports.PARALLEL = lang.PARALLEL;
exports.ABORT = lang.ABORT;
exports.WEAKABORT = lang.WEAKABORT;
exports.LOOP = lang.LOOP;
exports.LOOPEACH = lang.LOOPEACH;
exports.EVERY = lang.EVERY;
exports.SEQUENCE = lang.SEQUENCE;
exports.ATOM = lang.ATOM;
exports.SUSPEND = lang.SUSPEND;
exports.TRAP = lang.TRAP;
exports.EXIT = lang.EXIT;
exports.SIGNAL = lang.SIGNAL; /* local signal */
exports.INPUTSIGNAL = lang.INPUTSIGNAL;
exports.OUTPUTSIGNAL = lang.OUTPUTSIGNAL;
exports.RUN = lang.RUN;
exports.IF = lang.IF;
exports.EXEC = lang.EXEC;

exports.present = lang.present;
exports.prePresent = lang.prePresent;
exports.value = lang.value;
exports.preValue = lang.preValue;

exports.ReactiveMachine = machine.ReactiveMachine;

exports.InternalError = error.InternalError;
exports.CausalityError = error.CausalityError;
exports.SignalError = error.SignalError;
exports.SyntaxError = error.SyntaxError;
exports.TrapError = error.TrapError;
exports.TypeError = error.TypeError;

exports.OFF = 0;
exports.ANY = 1;
exports.ALL = 2;

if (typeof process !== 'undefined') {
   /* The batch interpreter require Node.JS libraries, so we can't
      export it on client */

   exports.batch = require("./batch.js").batch;
}
