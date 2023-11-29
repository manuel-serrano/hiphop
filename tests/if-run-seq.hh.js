"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

const pauseModule = hiphop module() { yield }

export const mach = new hh.ReactiveMachine(
   hiphop module() {
      loop {
	 host { mach.outbuf += ( ">>> start" ) + "\n" }
	 if( 1 ) {
	    run pauseModule() {};
	 } else {
	    yield;
	 }
	 host { mach.outbuf += ( ">>> end" ) + "\n" }
      }
   } );

mach.outbuf = "";
mach.react();
setTimeout( () => mach.react(), 200 );
