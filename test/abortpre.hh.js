"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   inout O; inout S;
   loop {
      abort( S.pre ) {
	 emit S();
	 yield;
	 emit O();
      }
      yield;
   }
}

//console.error(prg.pretty_print())

export const mach = new hh.ReactiveMachine(prg, "abortpre");
