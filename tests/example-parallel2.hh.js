"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   out J;
   signal I;
   
   fork {
      if( I.now ) emit J();
   } par {
      emit I();
   }
}

export const mach = new hh.ReactiveMachine( prg, "parallel2" );
