/*=====================================================================*/
/*    serrano/prgm/project/hiphop/0.2.x/lib/error.js                   */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Thu Aug  2 12:32:26 2018                          */
/*    Last change :                                                    */
/*    Copyright   :  2018 Manuel Serrano                               */
/*    -------------------------------------------------------------    */
/*    HipHop exception constructors.                                   */
/*    -------------------------------------------------------------    */
/*    These constructors are mere wrapper, only needed for             */
/*    client-side. They add locations to the error object so that      */
/*    the Hop client-side library can manage to report correct         */
/*    source code locations.                                           */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    HHSyntaxError ...                                                */
/*---------------------------------------------------------------------*/
function HHSyntaxError( msg, loc ) {
   const err = new SyntaxError( msg, loc );
   err.location = loc;
   return err;
}

/*---------------------------------------------------------------------*/
/*    HHTypeError ...                                                  */
/*---------------------------------------------------------------------*/
function HHTypeError( msg, loc ) {
   const err = new TypeError( msg, loc );
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

exports.InternalError = InternalError;

/* function CausalityError(loc, n_miss, listing) {                     */
/*    throw new TypeError( "causality error", loc );                   */
/*    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"); */
/*    listing();                                                       */
/*    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"); */
/*    HipHopError.call(this, "CAUSALITY ERROR", "missing " + n_miss + " nets", */
/* 		    undefined);                                        */
/* }                                                                   */
/*                                                                     */
/* CausalityError.prototype = new HipHopError(undefined, undefined, undefined); */
/*                                                                     */
/* exports.CausalityError = CausalityError;                            */

function SignalError(msg, signal_name, loc) {
   HipHopError.call(this, "SIGNAL ERROR on signal `" + signal_name + "`",
		    msg, loc);
}

SignalError.prototype = new HipHopError(undefined, undefined, undefined);

exports.SignalError = SignalError;

function RuntimeError(msg, loc) {
   HipHopError.call(this, "RUNTIME ERROR", msg, loc);
}

RuntimeError.prototype = new HipHopError(undefined, undefined, undefined);

exports.RuntimeError = RuntimeError;

/* function TypeError(expected, given, loc) {                          */
/*    HipHopError.call(this, "TYPE ERROR", "expected:" + expected + " given:" */
/* 		    + given, loc);                                     */
/* }                                                                   */
/*                                                                     */
/* TypeError.prototype = new HipHopError(undefined, undefined, undefined); */
/*                                                                     */
/* exports.TypeError = TypeError;                                      */

function MachineError(name, msg) {
   HipHopError.call(this, "REACTIVE MACHIME ERROR", name + ": " + msg,
		    undefined);
}

MachineError.prototype = new HipHopError(undefined, undefined, undefined);

exports.MachineError = MachineError;

/*---------------------------------------------------------------------*/
/*    exports                                                          */
/*---------------------------------------------------------------------*/
exports.SyntaxError = HHSyntaxError;
exports.TypeError = HHTypeError;
exports.CausalityError = HHTypeError;
