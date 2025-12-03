"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   in A; out T, V;
      
   abort {
      signal S;

      loop {
	 emit S();

	 if (S.now) emit T();
	 
	 yield;
	 emit V();
      }
   } when (A.now)
}

export const mach = new hh.ReactiveMachine(prg, "example3");
