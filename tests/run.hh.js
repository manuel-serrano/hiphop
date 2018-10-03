"use hiphop";
"use hopscript";

var hh = require( "hiphop" );

hiphop module sub( S, U, W, Z ) {
   fork {
      if( now( S ) ) emit W();
   } par {
      if( now( U ) ) emit Z();
   }
}

hiphop module main( in S, in U, A, B ) {
   run sub( S, U, W = A, Z = B );
} 

exports.prg = new hh.ReactiveMachine( main, "run2" );
