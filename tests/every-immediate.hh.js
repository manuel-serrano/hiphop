"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( in I, O ) {
   while( immediate now( I ) ) {
      emit O();
   }
}

exports.prg = new hh.ReactiveMachine( prg, "everyimmediate" );
