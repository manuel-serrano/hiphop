"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   out J;
   signal I;
   
   fork {
      emit I();
   } par {
      await( I.now );
      emit J();
   }
}

export const mach = new hh.ReactiveMachine( prg, "parallel" );
