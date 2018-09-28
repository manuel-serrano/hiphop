"use hiphop";

const hh = require( "hiphop" );

hiphop module t( n ) {
   hop { console.log( "1", nowval( n ) ) }
   hop { console.log( "2" ) }
}

new hh.ReactiveMachine( t ).react( {n: 34} );
