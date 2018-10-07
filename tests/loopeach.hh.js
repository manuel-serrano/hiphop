"use hiphop";
"use hopscript";

var hh = require( "hiphop" );

hiphop module prg( in I, O ) {
   do {
      emit O();
   } every( now( I ) )
}

exports.prg = new hh.ReactiveMachine( prg, "loopeach" );
