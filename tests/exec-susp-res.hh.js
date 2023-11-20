"use @hop/hiphop"
"use hopscript"

/* check if semantics of suspends / resume is correct when a task is over */

import * as hh from "@hop/hiphop";

let glob = 5;

const prg = hiphop module() {
   in RESS; in S; out O; out OT; in T;
   fork {
      suspend(S.now) {
	 async (T) {
	    mach.outbuf += "Oi.\n";
	    setTimeout(function(self) {
		  mach.outbuf += "Oi timeout.\n";
	       	  self.notify(glob++, false);
	       }, 1000, this);
	 } suspend {
	    mach.outbuf += "suspended.\n";
	 } resume {
	    mach.outbuf += "resumed.\n";
	 }
      }
      emit OT(T.nowval);
   } par {
      emit O();
   }

   await(RESS.now);
   emit OT(T.nowval);
}

export const mach = new hh.ReactiveMachine(prg, "exec");
mach.outbuf = "";
mach.debug_emitted_func = val => {
   mach.outbuf += (val.toString() ? "[ '" + val + "' ]\n" : "[]\n");
}

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
