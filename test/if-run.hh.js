"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

const pauseModule = hiphop module() {
   yield;
}

export const mach = new hh.ReactiveMachine(
   hiphop module() {
      loop {
	 pragma { mach.outbuf += (">>> start") + "\n" };
	 if (1) {
	    run pauseModule() {};
	 } else {
	    yield;
	 }
	 pragma { mach.outbuf += (">>> end") + "\n" }
      }
   } )

mach.outbuf = "";
mach.react();
mach.react();
