"use hopscript"

var kernel = require("./reactive-kernel.js");
var xml_syntax = require("./xml-compiler.js");
var interpreter = require("./batch-interpreter.js");
var pretty_printer = require("./pretty-printer.js");

exports.REACTIVEMACHINE = xml_syntax.REACTIVEMACHINE;
exports.EMIT = xml_syntax.EMIT;
exports.NOTHING = xml_syntax.NOTHING;
exports.PAUSE = xml_syntax.PAUSE;
exports.HALT = xml_syntax.HALT;
exports.PRESENT = xml_syntax.PRESENT;
exports.AWAIT = xml_syntax.AWAIT;
exports.PARALLEL = xml_syntax.PARALLEL;
exports.ABORT = xml_syntax.ABORT;
exports.LOOP = xml_syntax.LOOP;
exports.LOOPEACH = xml_syntax.LOOPEACH;
exports.EVERY = xml_syntax.EVERY;
exports.SEQUENCE = xml_syntax.SEQUENCE;
exports.ATOM = xml_syntax.ATOM;
exports.SUSPEND = xml_syntax.SUSPEND;
exports.TRAP = xml_syntax.TRAP;
exports.EXIT = xml_syntax.EXIT;
exports.LOCALSIGNAL = xml_syntax.LOCALSIGNAL;
exports.INPUTSIGNAL = xml_syntax.INPUTSIGNAL;
exports.OUTPUTSIGNAL = xml_syntax.OUTPUTSIGNAL;
exports.RUN = xml_syntax.RUN;
exports.IF = xml_syntax.IF;
exports.present = kernel.present;
exports.prePresent = kernel.prePresent;
exports.value = kernel.value;
exports.preValue = kernel.preValue;
exports.batch_interpreter = interpreter.interpreter;

if (process.versions.hop) {
   var esterel_frontend = require("./js-hop-binding.hop");
   exports.compile_from_esterel = esterel_frontend.compile_from_esterel;
}
