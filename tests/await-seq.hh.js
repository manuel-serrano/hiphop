"use hiphop";
"use hopscript";

var hh = require( "hiphop" );

hiphop module prg( in A, in B, out O ) {
   await now( A );
   await now( B );
   emit O();
}

exports.prg = new hh.ReactiveMachine( prg, "awaitseq" );
