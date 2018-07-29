"use hopscript"

const hh = require( "hiphop" );
const tl = hh.timelib;

hiphop module prg() {
   EXIT: fork {
      ${ <tl.timeout value=${200}/> };
      hop { console.log( "tick branch 1" ) };
      break EXIT;
   } par {
      ${ <tl.timeout value=${50}/> };
      hop { console.log( "tick branch 2" ) };
      break EXIT;
   }
   hop { console.log( "end" ) }
}
      
const m = new hh.ReactiveMachine( prg );

m.react();
