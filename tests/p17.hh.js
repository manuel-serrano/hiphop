"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( O ) {
   loop {
      signal S1;

      if( S1.now ) {
	 emit O();
      }

      yield;

      emit S1();
   }
}

exports.prg = new hh.ReactiveMachine( prg, "P17" )
