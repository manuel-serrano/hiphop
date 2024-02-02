import * as hh from "@hop/hiphop";

const hhpar = [
   hiphop { await(A.now) },
   hiphop { await(B.now) }, 
   hiphop { await(C.now) }
   ]

const prg = hiphop module() {
   in A; in B; in C; in R; out O;
			
   do {
      fork ${hhpar}
      emit O();
   } every (R.now)
}

export const mach = new hh.ReactiveMachine(prg, "STATING-ABCRO");


