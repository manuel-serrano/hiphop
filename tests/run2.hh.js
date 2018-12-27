"use hiphop"
"use hopscript"

var hh = require( "hiphop" );

hiphop module m1( T, W, V, Z ) {
   fork {
      if( T.now ) {
	 signal L;
	 
	 emit L();
	 emit V();
      }
   } par {
      if( W.now ) emit Z();
   }
}

hiphop module m2( in S, in U, A, B ) {
   signal L;

   emit L();

   run m1( T as S, W as U, V as A, Z as B );
   run m1( T as S, W as U, V as A, Z as B );
}

exports.prg = new hh.ReactiveMachine( m2, "run22" );
