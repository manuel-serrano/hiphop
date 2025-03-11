import * as hh from "@hop/hiphop";

const prg = hiphop module() {
   in A; in B; in R; out O;
		  
   do {
      fork {
	 await (A.now);
      } par {
	 await (B.now);
      }
      emit O();
   } every (R.now)
}

export const mach = new hh.ReactiveMachine(prg, "ABRO");
