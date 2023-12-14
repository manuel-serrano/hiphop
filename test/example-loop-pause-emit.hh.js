"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   in I; out S;
   loop {
      await( I.now );
      yield;
      emit S();
   }
}

export const mach = new hh.ReactiveMachine( prg, "looppauseemit" );
