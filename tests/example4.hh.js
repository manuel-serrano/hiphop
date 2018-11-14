"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( in A, T, V ) {
   signal S;

   loop {
      abort( A.now ) {
	 emit S();
	 if( S.now ) emit T();
	 yield;
	 emit V();
      }
   }
}

exports.prg = new hh.ReactiveMachine( prg, "example4" );
