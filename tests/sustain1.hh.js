"use hiphop"
"use hopscript"

const hh = require( "hiphop" );

hiphop module prg( in I, J, K ) {
   loop {
      abort( I.now ) {
	 sustain J();
      }
      emit K();
   }
}

exports.prg = new hh.ReactiveMachine( prg, "sustain1" );
