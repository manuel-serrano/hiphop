"use hiphop";
"use hopscript";

const hh = require( "hiphop" );

hiphop module prg( in I, O ) {
   every( I.now ) {
      emit O();
   }
}

exports.prg = new hh.ReactiveMachine( prg, "every1" );
