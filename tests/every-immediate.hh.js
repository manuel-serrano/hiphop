"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   in I; out O;
   every immediate( I.now ) {
      emit O();
   }
}

export const mach = new hh.ReactiveMachine( prg, "everyimmediate" );
