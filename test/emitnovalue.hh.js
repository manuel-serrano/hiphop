"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   out O;
   loop {
      emit O( 5 );
      yield;
      emit O();
   }
}

export const mach = new hh.ReactiveMachine(prg, "emitnovalue");
