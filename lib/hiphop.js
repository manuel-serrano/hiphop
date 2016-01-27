"use hopscript"

const machine = require("./machine.js");
const lang = require("./lang.js");
const error = require("./error.js");
const signal = require("./signal.js");

exports.MODULE = lang.MODULE;
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
exports.LOCALSIGNAL = lang.LOCALSIGNAL;
exports.INPUTSIGNAL = lang.INPUTSIGNAL;
exports.OUTPUTSIGNAL = lang.OUTPUTSIGNAL;
exports.RUN = lang.RUN;
exports.IF = lang.IF;

exports.present = signal.present;
exports.prePresent = signal.prePresent;
exports.value = signal.value;
exports.preValue = signal.preValue;

exports.ReactiveMachine = machine.ReactiveMachine;

exports.InternalError = error.InternalError;
exports.CausalityError = error.CausalityError;
exports.SignalError = error.SignalError;
exports.SyntaxError = error.SyntaxError;
exports.TypeError = error.TypeError;

if (typeof process !== 'undefined') {
   /* The batch interpreter and the object inspector require Node.JS libraries,
      so we can't export it on client */

   var batch = require("./batch.js");
   var inspector = require("./inspector.js");

   exports.batch = batch.batch;
   exports.Inspector = inspector.Inspector;
}
