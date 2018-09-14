"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( J ) {
   signal I;

   fork {
      if( now( I ) ) {
	 emit J( nowval( I ) );
      }
   } par {
      emit I( 5 );
   }
}

exports.prg = new hh.ReactiveMachine( prg, "parvalued" );
