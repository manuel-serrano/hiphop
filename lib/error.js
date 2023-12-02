/*=====================================================================*/
/*    serrano/prgm/project/hiphop/1.3.x/lib/error.js                   */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Thu Aug  2 12:32:26 2018                          */
/*    Last change :  Fri Dec  1 07:03:53 2023 (serrano)                */
/*    Copyright   :  2018-23 Manuel Serrano                            */
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
   if (loc) {
      err.location = loc;
      const stk = err.stack;
      let i = stk.indexOf("\n");
      let nstk = stk.substring(0, i);
      nstk += `"\n    at HipHop (file://${loc.filename}:${loc.pos})`
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
   if (loc) {
      err.location = loc;
      const stk = err.stack;
      let i = stk.indexOf("\n");
      let nstk = stk.substring(0, i);
      nstk += `"\n    at HipHop (file://${loc.filename}:${loc.pos})`
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
   HipHopError.call(this, "SIGNAL ERROR on signal `" + signame + "`",
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
