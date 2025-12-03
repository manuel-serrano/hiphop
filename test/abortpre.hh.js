"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   inout O; inout S;
   loop {
      abort {
	 emit S();
	 yield;
	 emit O();
      } when (S.pre)
      yield;
   }
}

export const mach = new hh.ReactiveMachine(prg, "abortpre");
