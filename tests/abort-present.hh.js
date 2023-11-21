"use @hop/hiphop";
"use hopscript"

import * as hh from "@hop/hiphop";

hiphop module prg() {
   in I; out J; out K; out V;
      
   loop {
      abort( I.now ) {
	 emit J();
	 yield;
	 emit V();
	 yield;
      }
      if( I.now ) {
	 emit K();
      }
   }
}

export const mach = new hh.ReactiveMachine(prg, "abortpresent");
