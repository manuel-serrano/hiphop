"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( J ) {
   let I;

   fork {
      if( now( I ) ) {
	 emit J( val( I ) );
      }
   } par {
      emit I( 5 );
   }
}

exports.prg = new hh.ReactiveMachine( prg, "parvalued" );
