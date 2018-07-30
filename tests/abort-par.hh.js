"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( in I, out O ) {
   let L;
   
   fork {
      abort now( L ) {
	 loop {
	    emit O();
	    yield;
	 }
      }
   } par {
      await now( I );
      emit L();
   }
}

exports.prg = new hh.ReactiveMachine( prg, "abortpar" );
