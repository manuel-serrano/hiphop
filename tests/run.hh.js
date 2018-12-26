"use hiphop";
"use hopscript";

var hh = require( "hiphop" );

hiphop module sub( S, U, W, Z ) {
   fork {
      if( S.now ) emit W();
   } par {
      if( U.now ) emit Z();
   }
}

hiphop module main( in S, in U, A, B ) {
   run sub( S, U, W as A, Z as B );
} 

exports.prg = new hh.ReactiveMachine( main, "run2" );
