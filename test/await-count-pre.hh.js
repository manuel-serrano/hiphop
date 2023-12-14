"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   in I; out O;
   loop {
      await count( 3, I.pre );
      emit O();
   }
}

export const mach = new hh.ReactiveMachine(prg, "await3");
