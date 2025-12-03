"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   in I; out O;
   signal L;

   fork {
      abort {
	 loop {
	    emit O();
	    yield;
	 }
      } when (L.now)
   } par {
      await (I.now);
      emit L();
   }
}

export const mach = new hh.ReactiveMachine(prg, "abortpar");
