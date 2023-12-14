"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   in I; out O;
   signal L;

   fork {
      abort( L.now ) {
	 loop {
	    emit O();
	    yield;
	 }
      }
   } par {
      await( I.now );
      emit L();
   }
}

export const mach = new hh.ReactiveMachine(prg, "abortpar");
