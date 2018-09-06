"use hiphop"
"use hopscript"

const hh = require( "hiphop" );

hiphop module prg( in A, in B, in R, out O ) {
   do {
      fork {
	 await now( A );
      } par {
	 await now( B );
      }
      emit O();
   } every( now( R ) )
}

exports.prg = new hh.ReactiveMachine( prg, "ABRO" );
