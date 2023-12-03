"use @hop/hiphop"
"use hopscript"

import * as hh from "@hop/hiphop";
import { format } from "util";

let glob = 5;

hiphop module prg(resolve) {
   in R; out O; out OT; in T;
   do {
      fork {
	 abort(R.now) {
	    async (T) {
	       mach.outbuf += ("Oi.") + "\n";
	       setTimeout(function(self) {
		  mach.outbuf += ("Oi timeout.") + "\n";
		  self.notify(glob++ , false);
		 }, 1000, this);
	    }
	 }
	 emit OT(T.nowval);
      } par {
	 emit O();
      }
   } every (R.now)
   host { resolve(false); }
}

export const mach = new hh.ReactiveMachine(prg, "exec");
mach.outbuf = "";
mach.debug_emitted_func = val => {
   mach.outbuf += format(val) + "\n";
}
mach.batchPromise = new Promise((res, rej) => mach.init(res));

mach.react()

setTimeout(function() {
   mach.inputAndReact("R")
}, 500);

setTimeout(function() {
   mach.react()
}, 1100);

setTimeout(function() {
   mach.react()
}, 2000);

