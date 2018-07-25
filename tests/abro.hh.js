"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( in A, in B, in R, out O ) {
   for( now( R ) ) {
      fork {
	 await now( A );
      } par {
	 await now( B );
      }
      emit O;
   }
}

exports.prg = new hh.ReactiveMachine( prg, "ABRO" );
