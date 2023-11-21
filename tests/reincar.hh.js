"use @hop/hiphop";
"use hopstrict";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   out O;
   loop {
      signal S;
      
      if( S.now ) emit O();
      yield;
      emit S();
   }
}

export const mach = new hh.ReactiveMachine( prg, "reincar" );
