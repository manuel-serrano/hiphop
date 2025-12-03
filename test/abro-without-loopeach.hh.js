"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   in A; in B; in R; out O;
		  
   loop {
      abort {
	 fork {
	    await (A.now);
	 } par {
	    await (B.now);
	 }
	 emit O();
	 halt;
      } when (R.now)
   }
};

export const mach = new hh.ReactiveMachine(prg, "ABRO");


