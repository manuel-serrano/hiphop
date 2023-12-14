"use @hop/hiphop"
"use hopscript"

import * as hh from "@hop/hiphop";

hiphop module prg() {
   in I; inout J, K;
   loop {
      abort( I.now ) {
	 sustain J();
      }
      emit K();
   }
}

export const mach = new hh.ReactiveMachine( prg, "sustain1" );
