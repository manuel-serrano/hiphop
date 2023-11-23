"use hopscript"

import * as hh from "@hop/hiphop";

hiphop module example() {
   in I;
   out O;
   loop {
      if (now(O)) emit I();
      emit O();
      yield;
   }
}

export const mach = new hh.ReactiveMachine(example, "presentemit");
