"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( J ) {
   let I;

   fork {
      emit I( 5 );
      if( now( I ) ) emit J( val( I ) );
   }
}

exports.prg = new hh.ReactiveMachine( prg, "parvalued2" );
