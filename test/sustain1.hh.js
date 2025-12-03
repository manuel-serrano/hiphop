"use @hop/hiphop"
"use hopscript"

import * as hh from "@hop/hiphop";

hiphop module prg() {
   in I; inout J, K;
   loop {
      abort {
	 sustain J();
      } when  (I.now)
      emit K();
   }
}

export const mach = new hh.ReactiveMachine( prg, {name: "sustain1", verbose: -1} );
