"use hopscript"

const hh = require( "hiphop" );

hiphop module prg( A, B ) {
   EXIT: fork {
      await now( A );
      hop { console.log( "A" ) }
      break EXIT;
   } par {
      await now( B );
      hop { console.log( "B" ) }
      break EXIT;
   }

   hop { console.log( "end" ) } ;
}

const m = new hh.ReactiveMachine( prg );

m.react();
m.inputAndReact( "B" );
