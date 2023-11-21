"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   out O;
   loop {
      signal S = 1;
      
      emit S( S.preval + 1 );
      emit O( S.nowval );
      yield;
      emit O( O.preval );
      yield;
   }
}

export const mach = new hh.ReactiveMachine( prg, "emitvaluedlocal1" );
