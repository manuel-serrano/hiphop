"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( in A, T, V ) {
   let S;

   loop {
      abort now( A ) {
	 emit S();
	 if( now( S ) ) emit T();
	 yield;
	 emit V();
      }
   }
}

exports.prg = new hh.ReactiveMachine( prg, "example4" );
