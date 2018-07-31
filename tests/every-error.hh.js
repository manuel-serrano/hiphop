"use hopscript"

var hh = require( "hiphop" );

try {
   hiphop module prg( I, O ) {
      every( immediate count( 2, now( I ) ) ) {
	 emit O();
      }
   }
} catch( e ) {
   console.log( e.message );
}
