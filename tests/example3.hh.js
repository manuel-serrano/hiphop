"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( in A, T, V ) {
   abort now( A ) {
      let S;

      loop {
	 emit S;

	 if( now( S ) ) emit T;
	 
	 yield;
	 emit V;
      }
   }
}

exports.prg = new hh.ReactiveMachine( prg, "example3" );
