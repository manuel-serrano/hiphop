/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/error.js                  */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Thu Aug  2 12:32:26 2018                          */
/*    Last change :  Fri Apr  5 08:20:57 2024 (serrano)                */
/*    Copyright   :  2018-24 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    HipHop exception constructors.                                   */
/*    -------------------------------------------------------------    */
/*    These constructors are mere wrapper, only needed for             */
/*    client-side. They add locations to the error object so that      */
/*    the Hop client-side library can manage to report correct         */
/*    source code locations.                                           */
/*=====================================================================*/
"use strict"

/*---------------------------------------------------------------------*/
/*    imports                                                          */
/*---------------------------------------------------------------------*/
import * as config from "./config.js";
const hopc = config.isServer ? await import("@hop/hopc") : {};

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
export { 
   HHReferenceError as ReferenceError, 
   HHTypeError as TypeError, 
   HHTypeError as CausalityError, 
   HHSyntaxError as SyntaxError,
   HHMachineError as MachineError
};
       
/*---------------------------------------------------------------------*/
/*    HHSyntaxError ...                                                */
/*---------------------------------------------------------------------*/
function HHSyntaxError(msg, loc) {
   const err = new SyntaxError(msg, loc);
   if (loc && config.isServer) {
      const { beg, end, lnum, col } = hopc.locToLnumCol(loc.filename, loc.pos);
      err.location = loc;
      const stk = err.stack;
      let i = stk.indexOf("\n");
      let nstk = stk.substring(0, i);
      if (beg > 0) {
	 nstk += `\n    at HipHop (file://${loc.filename}:${lnum}:${col})`;
      } else {
	 nstk += `\n    at HipHop (file://${loc.filename}:${loc.pos})`;
      }
      nstk += stk.substring(i);
      err.stack = nstk;
   }
   return err;
}

/*---------------------------------------------------------------------*/
/*    HHTypeError ...                                                  */
/*---------------------------------------------------------------------*/
function HHTypeError(msg, loc) {
   const err = new TypeError(msg);
   if (loc && config.isServer) {
      const { beg, end, lnum, col } = hopc.locToLnumCol(loc.filename, loc.pos);
      err.location = loc;
      const stk = err.stack;
      let i = stk.indexOf("\n");
      let nstk = stk.substring(0, i);
      if (beg > 0) {
	 nstk += `\n    at HipHop (file://${loc.filename}:${lnum}:${col})`;
      } else {
	 nstk += `\n    at HipHop (file://${loc.filename}:${loc.pos})`;
      }
      nstk += stk.substring(i);
      err.stack = nstk;
   }
   return err;
}

/*---------------------------------------------------------------------*/
/*    HHReferenceError ...                                             */
/*---------------------------------------------------------------------*/
function HHReferenceError(msg, loc) {
   const err = new ReferenceError(msg, loc);
   err.location = loc;
   return err;
}

function HipHopError(name, msg, loc) {
   let message = "";

   this.message = "*** " + name;
   if (loc)
      this.message += "\n*** " + loc
   if (msg)
      this.message += "\n*** " + msg
   Error.call(this, message);
}

HipHopError.prototype = new Error();

function InternalError(msg, loc) {
   HipHopError.call(this, "INTERNAL ERROR", msg, loc);
}

InternalError.prototype = new HipHopError(undefined, undefined, undefined);

function SignalError(msg, signame, loc) {
   HipHopError.call(this, 'SIGNAL ERROR on signal "' + signame + '"',
		    msg, loc);
}

SignalError.prototype = new HipHopError(undefined, undefined, undefined);

function RuntimeError(msg, loc) {
   HipHopError.call(this, "RUNTIME ERROR", msg, loc);
}

RuntimeError.prototype = new HipHopError(undefined, undefined, undefined);

function HHMachineError(name, msg) {
   HipHopError.call(this, "REACTIVE MACHIME ERROR", name + ": " + msg,
		    undefined);
}

HHMachineError.prototype = new HipHopError(undefined, undefined, undefined);
