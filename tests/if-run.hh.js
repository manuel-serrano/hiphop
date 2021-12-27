"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

const pauseModule = hiphop module() {
   yield;
}

const m = new hh.ReactiveMachine(
   hiphop module() {
      loop {
	 host { console.log( ">>> start" ) };
	 if( 1 ) {
	    run ${pauseModule}();
	 } else {
	    yield;
	 }
	 host { console.log( ">>> end" ) }
      }
   } )

m.react();
setTimeout( () => m.react(), 200 );
