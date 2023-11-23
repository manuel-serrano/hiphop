"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   in A = "_"; in B;
   loop {
      host {
	 mach.outbuf += ("A.now=" + A.now, "A.pre=" + A.pre, 
	    "A.nowval=" + A.nowval, "A.preval=" + A.preval) + "\n";
      	 mach.outbuf += ("B.now=" + B.now, "B.pre=" + B.pre, 
	    "B.nowval=" + B.nowval, "B.preval=" + B.preval) + "\n";
      }
      yield;
   }
}

export const mach = new hh.ReactiveMachine(prg);
mach.outbuf = "";
mach.debug_emitted_func = val => {
   mach.outbuf += (val.toString() ? "[ '" + val + "' ]\n" : "[]\n");
}
