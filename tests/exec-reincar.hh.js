"use @hop/hiphop"
"use hopscript"

import * as hh from "@hop/hiphop";

let glob = 5;

hiphop module prg() {
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
}

export const mach = new hh.ReactiveMachine(prg, "exec");
mach.outbuf = "";
mach.debug_emitted_func = val => {
   mach.outbuf += (val.toString() ? "[ '" + val + "' ]\n" : "[]\n");
}

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

