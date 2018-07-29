"use hopscript"

const hh = require( "hiphop" );

hiphop module prg() {
   t: {
      t2: {
	 break t2;
      }
      hop { console.log( "first level" ) };
   }
   hop { console.log( "top level" ) };
}

var m = new hh.ReactiveMachine( prg );

m.react();
