"use @hop/hiphop"
"use hopscript"

function plus( x, y ) { return x+y };

import * as hh from "@hop/hiphop";

hiphop module prg() {
   in I; in R; out O = 0;
   loop {
      abort( R.now ) {
	 await( I.now );
	 emit O( plus( O.preval, 1 ) );
	 yield;
      }
   }
}

export const mach = new hh.ReactiveMachine( prg, "Incr" );
