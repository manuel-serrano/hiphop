"use hopscript"

var hh = require( "hiphop" );

try {
   hiphop module prg( O=0 ) {
      emit O( val( O ) );
   }
} catch( e ) {
   console.log( "error: self update" );
}
