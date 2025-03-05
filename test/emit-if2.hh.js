import * as hh from "@hop/hiphop";
import { format } from "util";

hiphop module prg() {
   inout A, B, C;
   
   fork {
      loop {
	 if (B.nowval > 3) emit A();
	 yield;
      }
   } par {
      loop {
	 if (C.now) {
	    emit B(4);
	 } else {
	    emit B(3);
	 }
	 yield;
      }
   }
}

export const mach = new hh.ReactiveMachine(prg);
mach.outbuf = "";
mach.debug_emitted_func = emitted => {
   mach.outbuf += format(emitted) + "\n";
}

mach.react()
mach.react()
mach.react("C")
mach.react()
mach.react("C")
mach.react("C")

