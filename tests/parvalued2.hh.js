"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( J ) {
   signal I;

   fork {
      emit I( 5 );
      if( now( I ) ) emit J( nowval( I ) );
   }
}

exports.prg = new hh.ReactiveMachine( prg, "parvalued2" );
