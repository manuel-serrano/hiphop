"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( in I, O ) {
   every count( 2, I.now ) {
      emit O();
   }
}

exports.prg = new hh.ReactiveMachine( prg, "everydelay" );
