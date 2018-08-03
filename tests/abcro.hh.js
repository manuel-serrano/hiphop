"use hiphop"
"use hopscript"

var hh = require("hiphop");

hiphop module prg( in A, in B, in C, in R, out O ) {
   do {
      fork {
	 await now( A );
      } par {
	 await now( B );
      } par {
	 await now( C );
      }
      emit O();
   } while( now( R ) )
}
exports.prg = new hh.ReactiveMachine( prg, "ABCRO" );
