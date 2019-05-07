"use hopscript"

const hh = require( "hiphop" );

hiphop module prg( A, B ) {
   EXIT: fork {
      await( A.now );
      hop { console.log( "A" ) }
      break EXIT;
   } par {
      await( B.now );
      hop { console.log( "B" ) }
      break EXIT;
   }

   hop { console.log( "end" ) } ;
}

const m = new hh.ReactiveMachine( prg );

m.react();
m.inputAndReact( "B" );
