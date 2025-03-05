import * as hh from "@hop/hiphop";

hiphop module prg() {
   out O;
   loop {
      signal L;

      fork {
	 emit L();
      } par {
	 fork {
	    if (L.now) emit O();
	 }
      }

      yield;
   }
}

export const mach = new hh.ReactiveMachine( prg, "parallelunary" );
