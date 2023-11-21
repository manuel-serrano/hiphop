"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   inout J;
   signal I;

   fork {
      emit I( 5 );
      if( I.now ) emit J( I.nowval );
   }
}

export const mach = new hh.ReactiveMachine( prg, "parvalued2" );
