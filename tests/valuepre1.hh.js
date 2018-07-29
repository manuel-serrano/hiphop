"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( I, O=5, U ) {
   loop {
      emit I( ${3} );
      emit O( val( I ) );
      emit U( preval( O ) );
      yield;
   }
}

exports.prg = new hh.ReactiveMachine( prg, "valuepre1" );
