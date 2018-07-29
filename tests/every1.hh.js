"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( in I, O ) {
   every( now( I ) ) {
      emit O;
   }
}

exports.prg = new hh.ReactiveMachine( prg, "every1" );
