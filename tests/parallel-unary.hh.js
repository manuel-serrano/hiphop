"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( O ) {
   loop {
      signal L;

      fork {
	 emit L();
      } par {
	 fork {
	    if( now( L ) ) emit O();
	 }
      }

      yield;
   }
}

exports.prg = new hh.ReactiveMachine( prg, "parallelunary" );
