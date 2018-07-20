"use hopscript"

var hh = require("hiphop");

var prg = MODULE( INOUT O, INOUT S ) {
   LOOP {
      ABORT PRE( S ) {
	 EMIT S;
	 PAUSE;
	 EMIT O;
      }
      PAUSE;
   }
}

//console.error(prg.pretty_print())

exports.prg = new hh.ReactiveMachine(prg, "abortpre");
