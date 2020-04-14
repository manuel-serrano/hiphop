/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/hiphop.js                 */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal                                       */
/*    Creation    :  Mon Jul 16 11:23:59 2018                          */
/*    Last change :  Tue Apr 14 09:00:26 2020 (serrano)                */
/*    Copyright   :  2018-20 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    HipHop language definition                                       */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    imports                                                          */
/*---------------------------------------------------------------------*/
const machine = require( "./machine.js", "hopscript" );
const lang = require( "./lang.js", "hopscript" );
const error = require( "./error.js", "hopscript" );
const ast = require( "./ast.js", "hopscript" );

/*---------------------------------------------------------------------*/
/*    exports                                                          */
/*---------------------------------------------------------------------*/
export * from "./machine.js";

exports.version = require( "./config.js" ).version;
exports.runFrame = {};

exports.CAUSALITY_JSON = "hiphop.causality.json";

exports.MACHINE = lang.MACHINE;
exports.MODULE = lang.MODULE;
exports.INTERFACE = lang.INTERFACE;
exports.INTF = lang.INTF;
exports.FRAME = lang.FRAME;
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

exports.getModule = lang.getModule;
exports.getInterface = lang.getInterface;

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
exports.parallelmap = require("../ulib/parallelmap.js", "hopscript");

exports.isHiphopInstruction = lang.isHiphopInstruction;

//
// The batch interpreter require FS libraries, so we can't export
// it on client.
//
if( hop.isServer )
   exports.batch = require("./batch.js", "hopscript").batch;

/*---------------------------------------------------------------------*/
/*    language compiler (pre-processor)                                */
/*---------------------------------------------------------------------*/
const Parser = hop.isServer
   ? require( "../preprocessor/parser", "hopscript" )
   : { parse: function( _ ) { } };

function compiler( ifile, ofile=undefined ) {
   return {
      type: "ast",
      value: Parser.parse( ifile )
   }
}

compiler.parser = Parser.parser;

exports[ Symbol.compiler ] = compiler;
