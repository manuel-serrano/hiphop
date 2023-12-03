"use @hop/hiphop"
"use hopscript"

/* check if semantics of suspends / resume is correct when a task is over */

import * as hh from "@hop/hiphop";
import { format } from "util";

let glob = 5;

hiphop module prg(resolve) {
   in RESS; in S; out O; out OT; in T;
   fork {
      suspend(S.now) {
	 async (T) {
	    mach.outbuf += ("Oi.");
	    setTimeout(function(self) {
	       mach.outbuf += ("Oi timeout.");
	       	  self.notify(glob++, false);
	       }, 1000, this);
	 } suspend {
	    mach.outbuf += ("suspended.");
	 } resume {
	    mach.outbuf += ("resumed.");
	 }
      }
      emit OT(T.nowval);
   } par {
      emit O();
   }

   await(RESS.now);
   emit OT(T.nowval);
   host { resolve(false); }
}

export const mach = new hh.ReactiveMachine(prg, "exec");
mach.outbuf = "";
mach.debug_emitted_func = emitted => {
   mach.outbuf += format(emitted) + "\n";
}
mach.batchPromise = new Promise((res, rej) => mach.init(res));

mach.react()
mach.inputAndReact("S")
mach.inputAndReact("S")
mach.inputAndReact("S")
mach.inputAndReact("S")
mach.react()
mach.react()
mach.inputAndReact("S")

setTimeout(function() {
   mach.react()
   mach.inputAndReact("RESS")
   mach.inputAndReact("S")
   mach.react()
}, 2000);
