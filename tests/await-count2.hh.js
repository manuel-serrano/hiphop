"use hiphop"
"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( in I, out O ) {
   loop {
      await count( 3, I.now );
      emit O();
   }
}

exports.prg = new hh.ReactiveMachine( prg, "await3" );
