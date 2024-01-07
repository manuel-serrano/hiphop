import * as hh from "@hop/hiphop";

const prog = eval(hh.compileString(`hiphop module() {
   in A; in B; in R; out O;
		  
   do {
      fork {
	 await(A.now);
      } par {
	 await(B.now);
      }
      emit O();
   } every(R.now)
}`));

export const mach = new hh.ReactiveMachine(prog, "EABRO");
