"use hopscript"

var hh = require( "hiphop" );

hiphop module m1( T, W, V, Z ) {
   fork {
      if( now( T ) ) {
	 let L;
	 
	 emit L();
	 emit V();
      }
   } par {
      if( now( W ) ) emit Z();
   }
}

hiphop module m2( in S, in U, A, B ) {
   let L;

   emit L();

   run m1( T=S, W=U, V=A, Z=B );
   run m1( T=S, W=U, V=A, Z=B );
}

exports.prg = new hh.ReactiveMachine( m2, "run22" );
