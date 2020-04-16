"use hopscript"
let hh = require( "hiphop" );

hiphop module prg( O1, O2, OUTER = 0 ) {
   hop { console.log( "dans atom" ) }
   emit O1( (console.log("emit o1"), OUTER.nowval) );
   hop { console.log( "apres atom" ) }
   emit OUTER( 1 );
   emit O2( OUTER.nowval );
}

let machine = new hh.ReactiveMachine( prg, "TEST" );

try {
   machine.react();
} catch( e ) {
   console.log( "causality error" );
}
