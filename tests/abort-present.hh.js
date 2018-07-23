"use hopscript"

var hh = require("hiphop");

var prg = MODULE( IN I, OUT J, OUT K, OUT V ) {
   LOOP {
      ABORT( NOW( I ) ) {
	 EMIT J;
	 PAUSE;
	 EMIT V;
	 PAUSE;
      }
      IF( NOW( I ) ) {
	 EMIT K;
      }
   }
}

exports.prg = new hh.ReactiveMachine(prg, "abortpresent");
