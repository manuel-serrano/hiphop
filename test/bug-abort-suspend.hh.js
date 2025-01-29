"use @hop/hiphop"
"use hopscript"

import { ReactiveMachine } from "@hop/hiphop";

// should be equivalent to bug-abort.hh.js
hiphop module prg() {
   in A;
   out C;

   T: fork {
      suspend (A.now) {
	 ;
      }
      break T;
   } par {
      loop {
	 yield;
	 if (A.now) {
	    break T;
	 }
      }
   }
   emit C(123);
}

export const mach = new ReactiveMachine(prg);
mach.outbuf = "";
mach.addEventListener("C", e => mach.outbuf += ("got C: " + e.nowval + "\n"));
mach.outbuf += ("1\n");
mach.react({});
mach.outbuf += ("2\n");
mach.react({A:111});
mach.outbuf += ("3\n");

