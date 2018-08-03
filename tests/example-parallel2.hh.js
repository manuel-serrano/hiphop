"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( J ) {
   signal I;
   
   fork {
      if( now( I ) ) emit J();
   } par {
      emit I();
   }
}

exports.prg = new hh.ReactiveMachine( prg, "parallel2" );
