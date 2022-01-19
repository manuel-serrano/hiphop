"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

const mach = new hh.ReactiveMachine(
   hiphop module() {
      in L;
      T1: fork {
	 break T1;
      } par {
	 suspend( L.now ) {
	    yield;
	 }
      }
      hop { console.log( "exit trap" ) }
   } );

mach.react();
