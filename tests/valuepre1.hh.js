"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   inout I; out O = 5; out U;
   loop {
      emit I(3);
      emit O(I.nowval);
      emit U(O.preval);
      yield;
   }
}

export const mach = new hh.ReactiveMachine(prg, "valuepre1");
