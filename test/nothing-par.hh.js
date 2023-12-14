"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   fork {
      yield;
   } par {
   }
}

export const mach = new hh.ReactiveMachine( prg, "nothingpar" );
