"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( in I, out J, out K, out V ) {
   loop {
      abort( now( I ) ) {
	 emit J();
	 yield;
	 emit V();
	 yield;
      }
      if( now( I ) ) {
	 emit K();
      }
   }
}

exports.prg = new hh.ReactiveMachine( prg, "abortpresent" );
