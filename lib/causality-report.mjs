/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/causality-report.mjs      */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano & Jayanth Krishnamurthy            */
/*    Creation    :  Tue Jul  9 11:59:33 2019                          */
/*    Last change :  Thu Mar  6 11:26:38 2025 (serrano)                */
/*    Copyright   :  2019-25 Inria                                     */
/*    -------------------------------------------------------------    */
/*    HipHop causality error reporting                                 */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
import * as config from "./config.js";
import * as ast from "./ast.js";
import * as error from "./error.js";
import * as fs from "fs";
import { readLines } from "@hop/readlines";
import { findCausalityError, findCausalityErrorDefault } from "./causality.js";

export { reportCausalityError };

/*---------------------------------------------------------------------*/
/*    DEBUG                                                            */
/*---------------------------------------------------------------------*/
const TRACE = process.env.HIPHOP_TRACE
   && process.env.HIPHOP_TRACE.split(",").find(n => n === "causality");
const DEBUG = process.env.HIPHOP_DEBUG
   && process.env.HIPHOP_DEBUG.split(",").find(n => n === "causality");
const NODEBUG = process.env.HIPHOP_DEBUG
   && process.env.HIPHOP_DEBUG.split(",").find(n => n === "0");

/*---------------------------------------------------------------------*/
/*    reportCausalityError ...                                         */
/*---------------------------------------------------------------------*/
function reportCausalityError(mach) {
   const { loc, size, signals, json, cycles } = findCausalityError(mach);

   // Checking the error type
   if (size > 0) {
      if (mach.verbose >= 1 || DEBUG) {
	 if (signals.length === 0) {
	    console.error("*** Instantaneous loop.");
	 } else {
	    console.error(`*** CYCLE DETECTED: signals "${signals.join(', ')}"`);
	 }

	 if (TRACE) {
	    console.error("unpropagated nets", mach.nets.filter(n => !n.isInKnownList).map(n => n.id));
	 }
	 
	 if ((mach.verbose >= 1  || DEBUG) && config.isServer) {
	    if (cycles.length > 0) {
	       reportCausalityCycles(cycles);
	       dumpCausalityError(json);
	    } else {
	       const { json: djson, cycles: dcycles } =
		  findCausalityErrorDefault(mach);
	       reportCausalityCycles(dcycles);
	       dumpCausalityError(djson);
	    }
	 } else {
	    if (mach.verbose < 1) {
	       console.error("Use ReactiveMachine(p, {..., verbose: 2}) for extra information");
	    }
	 }
      } else {
	 if ((mach.verbose >= 0 && mach.verbose < 1) && !NODEBUG) {
	    console.error("*** HIPHOP ERROR: set the environment variable")
	    console.error("  HIPHOP_DEBUG=causality");
	    console.error("or use")
	    console.error("  new ReactiveMachine(p, {..., verbose: 1})");
	    console.error("for information about the error.");
	    console.error("");
	 }
      }
   } else {
      if (TRACE) {
	 console.error("unpropagated nets", mach.nets.filter(n => !n.isInKnownList).map(n => n.id));
      }

      if (signals.length === 0) {
	 throw error.TypeError("Instantaneous loop.", mach.nets.find(n => !n.isInKnownList).loc);
      }
      
   }
}

/*---------------------------------------------------------------------*/
/*    reportCausalityCycles ...                                        */
/*---------------------------------------------------------------------*/
function reportCausalityCycles(cycles) {
   cycles.forEach(src => {
      src.forEach(({filename, locations}) => {
	 if (fs.existsSync(filename)) {
	    const fd = fs.openSync(filename, "r");
	    try {
	       const lines = readLines(fd);
	       const bindex = filename.lastIndexOf("/");
	       let pos = 0, locIndex = 0, lineIndex = 1, lastLine = -1;

	       console.error("\x1B[34m\x1B[1m"
		  + filename.substring(bindex + 1)
		  + "\x1B[0m:");
	       lines.forEach(line => {
		  const loc = locations[locIndex];
		  if (loc >= pos && loc <= pos + line.length) {
		     if (lineIndex > (lastLine + 1) && lastLine > 0) {
			console.error("...");
		     }
		     console.error(lineNumber(lineIndex), lineError(line, loc - pos));
		     locIndex++;
		     lastLine = lineIndex;
		  }
		  pos += line.length + 1;
		  lineIndex++;
	       });
	    } finally {
	       fs.close(fd);
	    }
	 }
      });
   });
}

/*---------------------------------------------------------------------*/
/*    dumpCausalityError ...                                           */
/*---------------------------------------------------------------------*/
function dumpCausalityError(json) {
   fs.writeFileSync(config.CAUSALITY_JSON, json);
}

/*---------------------------------------------------------------------*/
/*    lineNumber ...                                                   */
/*---------------------------------------------------------------------*/
function lineNumber(num) {
   if (num < 10) {
      return "  \x1B[34m\x1B[1m" + num + "\x1B[0m:";
   } else if (num < 100) {
      return " \x1B[34m\x1B[1m" + num + "\x1B[0m:";
   } else {
      return "\x1B[34m\x1B[1m" + num + "\x1B[0m:";
   }
}

/*---------------------------------------------------------------------*/
/*    lineError ...                                                    */
/*---------------------------------------------------------------------*/
function lineError(line, col) {
   const prefix = line.substring(0, col);
   const rest = line.substring(col);
   const en = rest.match(/[a-zA-Z_$]+/);
   if (en) {
      return prefix + "\x1B[35m\x1B[1m"
	 + en[0] 
	 + "\x1B[0m" + line.substring(col + en[0].length);
   } else {
      return line;
   }
}

