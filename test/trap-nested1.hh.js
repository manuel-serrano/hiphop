"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   inout A, B, C, D;
   emit A();
   U: {
      T: {
	 break T;
	 emit B();
      }
      break U;
      emit C();
   }
   emit D();
}

export const mach = new hh.ReactiveMachine( prg, "trapnested1" );
