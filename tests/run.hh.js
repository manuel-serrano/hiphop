"use hiphop";
"use hopscript";

var hh = require( "hiphop" );

hiphop module m1( S, U, W, Z ) {
   fork {
      if( now( S ) ) emit W();
   } par {
      if( now( U ) ) emit Z();
   }
}

hiphop module run2( in S, in U, A, B ) {
   run m1( S, U, W = A, Z = B );
} 

exports.prg = new hh.ReactiveMachine( run2, "run2" );
