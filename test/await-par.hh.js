"use @hop/hiphop";
"use hopscript";


import * as hh from "@hop/hiphop";

hiphop module prg() {
   in A; in B; out O;
	    
   fork {
      await( A.now );
   } par {
      await( B.now );
   }
   emit O();
}

export const mach = new hh.ReactiveMachine(prg, "awaitpar");
