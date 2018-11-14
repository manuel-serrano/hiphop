"use hiphop"
"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( I, O=5, U ) {
   loop {
      emit I( ${3} );
      emit O( I.nowval );
      emit U( O.preval );
      yield;
   }
}

exports.prg = new hh.ReactiveMachine( prg, "valuepre1" );
