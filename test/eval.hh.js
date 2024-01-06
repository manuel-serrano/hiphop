import * as hh from "@hop/hiphop";

const prog = hh.hheval(`hiphop module() {
   in A; in B; in R; out O;
		  
   do {
      fork {
	 await(A.now);
      } par {
	 await(B.now);
      }
      emit O();
   } every(R.now)
}`);

const mach = new hh.ReactiveMachine(prog, "EABRO");
