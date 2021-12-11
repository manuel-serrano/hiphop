"use hopscript"

const hh = require( "hiphop" );

function makePar( x, y ) {
   return hiphop fork {
      hop { x() }
   } par {
      hop { y() }
   }
}

hiphop machine M() {
   "myseq" {
      loop {	      
        hop { console.log( "a" ) }
	yield;
        hop { console.log( "b" ) }
	yield;
        hop { console.log( "c" ) }
	yield;
      }
   }
}

M.react();

const seq = M.getElementById( "myseq" );

seq.appendChild( makePar( () => console.log( "p1" ), () => console.log( "p2" ) ) );

M.react();
M.react();
