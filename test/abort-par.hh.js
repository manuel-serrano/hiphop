"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

const prg = hiphop module() {
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
