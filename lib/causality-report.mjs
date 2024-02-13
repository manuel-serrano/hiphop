/*=====================================================================*/
/*    serrano/prgm/project/hiphop/1.3.x/lib/causality-report.mjs       */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano & Jayanth Krishnamurthy            */
/*    Creation    :  Tue Jul  9 11:59:33 2019                          */
/*    Last change :  Tue Feb 13 15:09:46 2024 (serrano)                */
/*    Copyright   :  2019-24 Inria                                     */
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
/*    reportCausalityError ...                                         */
/*---------------------------------------------------------------------*/
function reportCausalityError(mach) {
   const { loc, size, signals, json, cycles } = findCausalityError(mach);

   // Checking the error type
   if (size > 0) {
      if (mach.verbose >= 1) {
	 console.error(`*** CYCLE DETECTED: signals "${signals.join(', ')}"`);
	 if (mach.verbose >= 2 && config.isServer) {
	    if (cycles.length > 0) {
	       reportCausalityCycles(cycles);
	       dumpCausalityError(json);
	    } else {
	       const { json: djson, cycles: dcycles } = findCausalityErrorDefault(mach);
	       reportCausalityCycles(dcycles);
	       dumpCausalityError(djson);
	    }
	 }
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

