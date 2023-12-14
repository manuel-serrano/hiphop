"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   out O;
   emit O( 123 );
   loop {
      {
         signal S=0;
         emit S( 1 );
         yield;
         emit S( S.preval + 1 );
         emit O( S.nowval );
      }
   }
}

export const mach = new hh.ReactiveMachine(prg, "P19");
