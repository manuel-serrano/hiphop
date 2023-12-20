"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";
import { format } from "util";

hiphop module prg(resolve) {
   in T; out O;
   let tick = 0;
   fork {
      async (T) {
	 mach.outbuf += "in async, emitting T\n";
	 this.notify(5, false);
      }
   } par {
      await (T.now);
      emit O(tick);
   } par {
      loop {
	 pragma { mach.outbuf += "tick " + tick++ + "\n"; }
	 yield;
      }
   }
}

export const mach = new hh.ReactiveMachine(prg, "exec");
mach.outbuf = "";
mach.debug_emitted_func = val => {
   mach.outbuf += format(val) + "\n";
}
