"use hiphop"
"use hopscript"

var hh = require("hiphop");

hiphop module prg( in A, in B, in C, in R, out O ) {
   for( now( R ) ) {
      fork {
	 await now( A );
      } par {
	 await now( B );
      } par {
	 await now( C );
      }
      emit O;
   }
}
exports.prg = new hh.ReactiveMachine( prg, "ABCRO" );
