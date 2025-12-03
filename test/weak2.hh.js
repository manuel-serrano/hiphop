"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module m() {
   in S; out O, F, W, Z;
   weakabort {
      loop {
	 emit O();
	 yield;
	 emit W();
	 yield;
	 emit Z();
      }
   } when (S.now)
   emit F();
}
   
export const mach = new hh.ReactiveMachine( m, "wabort2" );
