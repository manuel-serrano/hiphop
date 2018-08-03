"use hopscript"

var hh = require( "hiphop" );

function plus( a, b ) {
   return a + b;
}

hiphop module prg( S, I, J ) {
   loop {
      fork {
	 signal M=5;
	 
	 emit J( val( M ) );
	 yield;
	 emit M( 5 );
      } par {
	 signal N;
	 
	 if( now( N ) ) emit I();
	 yield;
	 emit N();
      } par {
	 signal L;
	 
	 emit L( 4 );
	 yield;
	 emit S( plus( val( L ), 5 ) );
      }
   }
}

exports.prg = new hh.ReactiveMachine( prg, "reincar2" );
