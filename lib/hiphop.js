"use strict"
"use hopscript"

const machine = require("./machine.js");
const lang = require("./lang.js");
const error = require("./error.js");
const ast = require("./ast.js");
const on_client = typeof process === "undefined";

//
// Exports HH languages instructions.
//
exports.MODULE = lang.MODULE;
exports.LET = lang.LET;
exports.EMIT = lang.EMIT;
exports.SUSTAIN = lang.SUSTAIN;
exports.NOTHING = lang.NOTHING;
exports.PAUSE = lang.PAUSE;
exports.HALT = lang.HALT;
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
exports.RUN = lang.RUN;
exports.IF = lang.IF;
exports.EXEC = lang.EXEC;

//
// Exports HH reactive machine constructor.
//
exports.ReactiveMachine = machine.ReactiveMachine;

//
// Exports HH error handling.
//
exports.InternalError = error.InternalError;
exports.CausalityError = error.CausalityError;
exports.SignalError = error.SignalError;
exports.SyntaxError = error.SyntaxError;
exports.TypeError = error.TypeError;

//
// Symbolic names for signal accessibilities. Can be needed to enforce
// input or output signals on HH programs.
//
exports.IN = lang.IN;
exports.OUT = lang.OUT;
exports.INOUT = lang.INOUT;

//
// User libs.
//
let dir = (on_client ?
	   module.filename + "/../../" :
	   require("path").dirname(module.filename) + "/../");

exports.timelib = dir + "ulib/timelib.js";
exports.waitnsignals = dir + "ulib/waitnsignals.js";

//
// Helper function telling is an object holds an HH instructions.
//
exports.isHiphopInstruction = function(obj) {
   return obj instanceof ast.ASTNode
}

//
// The batch interpreter require Node.JS libraries, so we can't export
// it on client.
//
if (!on_client)
   exports.batch = require("./batch.js").batch;
