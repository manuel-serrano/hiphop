"use hiphop";
"use hopscript";

const hh = require( "hiphop" );

hiphop module prg( O ) {
   loop {
      signal L;

      fork {
	 emit L();
      } par {
	 fork {
	    if( L.now ) emit O();
	 }
      }

      yield;
   }
}

exports.prg = new hh.ReactiveMachine( prg, "parallelunary" );
