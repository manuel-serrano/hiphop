"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( in A, in B, out O ) {
   fork {
      await now( A );
   } par {
      await now( B );
   }
   emit O();
}

exports.prg = new hh.ReactiveMachine( prg, "awaitpar" );
