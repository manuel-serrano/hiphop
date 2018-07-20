"use hopscript"

var hh = require("hiphop");

var prg = MODULE( IN I, OUT O ) {
   LOCAL( L ) {
      FORK {
	 ABORT NOW( L ) {
	    LOOP {
	       EMIT O;
	       PAUSE;
	    }
	 }
      } PAR {
	 AWAIT NOW( I );
	 EMIT L;
      }
   }
}

exports.prg = new hh.ReactiveMachine(prg, "abortpar");
