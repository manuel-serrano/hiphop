"use hiphop"
"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( in I, out O ) {
   signal L;
   
   fork {
      abort( L.now ) {
	 loop {
	    emit O();
	    yield;
	 }
      }
   } par {
      await( I.now );
      emit L();
   }
}

exports.prg = new hh.ReactiveMachine( prg, "abortpar" );
