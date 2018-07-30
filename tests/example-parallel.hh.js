"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( J ) {
   let I;
   fork {
      emit I();
   } par {
      await now( I );
      emit J();
   }
}

exports.prg = new hh.ReactiveMachine( prg, "parallel" );
