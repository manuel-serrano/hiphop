"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   in A; out T, V;
   signal S;

   loop {
      abort( A.now ) {
	 emit S();
	 if( S.now ) emit T();
	 yield;
	 emit V();
      }
   }
}

export const mach = new hh.ReactiveMachine( prg, "example4" );
