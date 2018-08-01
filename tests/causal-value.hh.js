"use hopscript"
let hh = require( "hiphop" );

hiphop module prg( O1, O2, OUTER = 0 ) {
   hop { console.log( "dans atom" ) }
   emit O1( (v => { console.log("emit o1"); return v })( val( OUTER ) ) );
   hop { console.log( "apres atom" ) }
   emit OUTER( 1 );
   emit O2( val( OUTER ) );
}

let machine = new hh.ReactiveMachine( prg, "TEST" );

try {
   machine.react();
} catch( e ) {
   console.log( "causality error" );
}
