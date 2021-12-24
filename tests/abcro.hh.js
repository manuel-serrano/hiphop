"use hiphop";
"use hopscript";

import * as hh from "../";

hiphop module prg(in A, in B, in C, in R, out O) {
   do {
      fork {
	 await(A.now);
      } par {
	 await(B.now);
      } par {
	 await(C.now);
      }
      emit O();
   } every (R.now)
}

exports.prg = new hh.ReactiveMachine(prg, "ABCRO");


