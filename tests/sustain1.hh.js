"use hopscript"

const hh = require( "hiphop" );

hiphop module prg( in I, J, K ) {
   loop {
      abort( now( I ) ) {
	 sustain J();
      }
      emit K();
   }
}

exports.prg = new hh.ReactiveMachine( prg, "sustain1" );
