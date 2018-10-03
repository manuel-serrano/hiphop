"use hiphop";
"use hopscript";

const hh = require( "hiphop" );

hiphop module prg( O=5 combine (x, y) => x + y ) {
   loop {
      emit O( ${5} );
      emit O( ${10} );
      yield;
   }
}

exports.prg = new hh.ReactiveMachine( prg, "value1" );
