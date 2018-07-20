"use hiphop"
"use hopscript"

var hh = require("hiphop");

var prg = MODULE( IN A, IN B, IN C, IN R, OUT O ) {
   LOOPEACH( NOW( R ) ) {
      FORK {
	 AWAIT NOW( A );
      } PAR {
	 AWAIT NOW( B );
      } PAR {
	 AWAIT NOW( C );
      }
      EMIT O;
   }
}

exports.prg = new hh.ReactiveMachine( prg, "ABCRO" );
