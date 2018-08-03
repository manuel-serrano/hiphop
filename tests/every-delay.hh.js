"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( in I, O ) {
   while( count( 2, now( I ) ) ) {
      emit O();
   }
}

exports.prg = new hh.ReactiveMachine( prg, "everydelay" );
