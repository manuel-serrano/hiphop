"use strict"
"use hopscript"

const on_client = typeof process === "undefined";
exports.on_client = on_client;

const machine = require("./machine.js");
const lang = require("./lang.js");
const error = require("./error.js");
const ast = require("./ast.js");

//
// Exports HH languages instructions.
//
exports.MODULE = lang.MODULE;
exports.LOCAL = lang.LOCAL;
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
// TODO: libs should be loaded if needed (and hh.mylib should only
// return the location of the lib). But it seems to be broken with web
// browsers. For now, all libs are automatically imported.
//
// let dir = (on_client ?
// 	   module.filename + "/../../" :
// 	   require("path").dirname(module.filename) + "/../");

// exports.timelib = dir + "ulib/timelib.js";
// exports.waitnsignals = dir + "ulib/waitnsignals.js";
exports.timelib = require("../ulib/timelib.js");
exports.waitnsignals = require("../ulib/waitnsignals.js");
exports.parallelmap = require("../ulib/parallelmap.js");

exports.isHiphopInstruction = lang.isHiphopInstruction;

//
// The batch interpreter require Node.JS libraries, so we can't export
// it on client.
//
if (!on_client)
   exports.batch = require("./batch.js").batch;

//
// preprocessor hop.js hook
//
exports[Symbol.compiler] = iFile => {
   const SourceMapGenerator =
	 require("source-map", "hopscript").SourceMapGenerator;
   const fs = require("fs");
   const path = require("path");
   const Lexer = require("../preprocessor/lexer").Lexer;
   const Parser = require("../preprocessor/parser").Parser;
   const cacheDir = require(hop.config).cacheDir + "/hiphopjs/";
   const iBuffer = fs.readFileSync(iFile, "utf8");
   const oFile = cacheDir + path.basename(iFile);
   const oMapFile = cacheDir + `${path.basename(iFile)}.map`;
   const iStat = fs.statSync(iFile);
   const oStat = fs.existsSync(oFile) ? fs.statSync(oFile) : false;

   fs.mkdir(cacheDir);
   if (!oStat || oStat.mtime < iStat.mtime) {
      const sourceMap = new SourceMapGenerator({
	 file: oFile
      });

      const oBuffer = (new Parser(
	 new Lexer(iBuffer),
	 iFile,
	 sourceMap
      ).gen()) + `

//# sourceMappingURL=${oMapFile}`;
      fs.writeFileSync(oFile, oBuffer);
      fs.writeFileSync(oMapFile, sourceMap.toString());
   }

   return {
      type: "filename",
      value: oFile,
   }
};
