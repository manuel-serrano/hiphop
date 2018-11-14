"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( J ) {
   signal I;

   fork {
      if( I.now ) {
	 emit J( I.nowval );
      }
   } par {
      emit I( 5 );
   }
}

exports.prg = new hh.ReactiveMachine( prg, "parvalued" );
