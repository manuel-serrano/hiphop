/*=====================================================================*/
/*    serrano/prgm/project/hiphop/0.2.x/lib/hiphop.js                  */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal                                       */
/*    Creation    :  Mon Jul 16 11:23:59 2018                          */
/*    Last change :  Tue Sep  4 08:59:26 2018 (serrano)                */
/*    Copyright   :  2018 Manuel Serrano                               */
/*    -------------------------------------------------------------    */
/*    HipHop language definition                                       */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    autoconf                                                         */
/*---------------------------------------------------------------------*/
const on_client = typeof process === "undefined";
exports.on_client = on_client;

/*---------------------------------------------------------------------*/
/*    imports                                                          */
/*---------------------------------------------------------------------*/
const machine = require("./machine.js", "hopscript");
const lang = require("./lang.js", "hopscript");
const error = require("./error.js", "hopscript");
const ast = require("./ast.js", "hopscript");

/*---------------------------------------------------------------------*/
/*    exports                                                          */
/*---------------------------------------------------------------------*/
exports.MODULE = lang.MODULE;
exports.LOCAL = lang.LOCAL;
exports.SIGNAL = lang.SIGNAL;
exports.EMIT = lang.EMIT;
exports.SUSTAIN = lang.SUSTAIN;
exports.NOTHING = lang.NOTHING;
exports.PAUSE = lang.PAUSE;
exports.HALT = lang.HALT;
exports.AWAIT = lang.AWAIT;
exports.SIGACCESS = lang.SIGACCESS;
exports.FORK = lang.FORK;
exports.PARALLEL = lang.FORK;
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

exports.ReactiveMachine = machine.ReactiveMachine;

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
// TODO: libs should be loaded if needed (and hh.mylib should only
// return the location of the lib). But it seems to be broken with web
// browsers. For now, all libs are automatically imported.
//
// let dir = (on_client ?
// 	   module.filename + "/../../" :
// 	   require("path").dirname(module.filename) + "/../");

// exports.timelib = dir + "ulib/timelib.js";
// exports.waitnsignals = dir + "ulib/waitnsignals.js";
exports.timelib = require("../ulib/timelib.js", "hopscript");
exports.waitnsignals = require("../ulib/waitnsignals.js", "hopscript");
exports.parallelmap = require("../ulib/parallelmap.js", "hopscript");

exports.isHiphopInstruction = lang.isHiphopInstruction;

//
// The batch interpreter require FS libraries, so we can't export
// it on client.
//
if (!on_client)
   exports.batch = require("./batch.js", "hopscript").batch;

/*---------------------------------------------------------------------*/
/*    language compiler (pre-processor)                                */
/*---------------------------------------------------------------------*/
exports[ Symbol.compiler ] = ( ifile, ofile=undefined ) => {
   const Parser = require( "../preprocessor/astparser", "hopscript" );

   return {
      type: "ast",
      value: Parser.parse( ifile )
   }
}
