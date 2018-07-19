/*=====================================================================*/
/*    serrano/prgm/project/hiphop/0.2.x/lib/hiphop.js                  */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal                                       */
/*    Creation    :  Mon Jul 16 11:23:59 2018                          */
/*    Last change :  Thu Jul 19 11:26:00 2018 (serrano)                */
/*    Copyright   :  2018 Manuel Serrano                               */
/*    -------------------------------------------------------------    */
/*    HipHop language definition                                       */
/*=====================================================================*/
"use strict"
"use hopscript"

const on_client = typeof process === "undefined";
exports.on_client = on_client;

const machine = require("./machine.js", "hopscript");
const lang = require("./lang.js", "hopscript");
const error = require("./error.js", "hopscript");
const ast = require("./ast.js", "hopscript");

//
// Exports HH languages instructions.
//
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
// The batch interpreter require Node.JS libraries, so we can't export
// it on client.
//
if (!on_client)
   exports.batch = require("./batch.js", "hopscript").batch;

/*---------------------------------------------------------------------*/
/*    language compiler (pre-processor)                                */
/*---------------------------------------------------------------------*/
/* exports[ Symbol.compiler ] = ( iFile, oFileOpt=undefined ) => {     */
/*    const SourceMapGenerator =                                       */
/* 	 require( "source-map", "hopscript" ).SourceMapGenerator;      */
/*    const fs = require( "fs", "hopscript" );                         */
/*    const path = require( "path", "hopscript" );                     */
/*    const Lexer = require( "../preprocessor/lexer", "hopscript" ).Lexer; */
/*    const Parser = require( "../preprocessor/parser", "hopscript" ).Parser; */
/*    const cacheDir = require( hop.config, "hopscript" ).cacheDir + "/hiphopjs/"; */
/*    const iBuffer = fs.readFileSync( iFile, "utf8" );                */
/*    const oFile = oFileOpt || cacheDir + path.basename( iFile );     */
/*    const oMapFile = cacheDir + `${path.basename(iFile)}.map`;       */
/*    const iStat = fs.statSync( iFile );                              */
/*    const oStat = fs.existsSync( oFile ) ? fs.statSync( oFile ) : false; */
/*    let p;                                                           */
/*                                                                     */
/*    if( !oFileOpt && !fs.existsSync( cacheDir ) ) {                  */
/*       fs.mkdirSync(cacheDir);                                       */
/*    }                                                                */
/*                                                                     */
/*    if( !oStat || oStat.mtime < iStat.mtime ) {                      */
/*       const sourceMap = new SourceMapGenerator( {                   */
/* 	 file: oFile                                                   */
/*       } );                                                          */
/*                                                                     */
/*       p = new Parser( new Lexer( iFile, iBuffer ), iFile, sourceMap ); */
/*       const oBuffer = p.gen() + `                                   */
/*                                                                     */
/* //# sourceMappingURL=${oMapFile}`;                                  */
/*                                                                     */
/*       if ( p.hasHHcode ) {                                          */
/* 	 fs.writeFileSync( oFile, oBuffer );                           */
/* 	 fs.writeFileSync( oMapFile, sourceMap.toString() );           */
/*       }                                                             */
/*    }                                                                */
/*                                                                     */
/*    return {                                                         */
/*       type: "filename",                                             */
/*       value: p && !p.hasHHcode ? iFile : oFile,                     */
/*    }                                                                */
/* };                                                                  */

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
