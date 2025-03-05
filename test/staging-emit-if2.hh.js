import * as hh from "@hop/hiphop";
import { format } from "util";

const sigA = "A";
const sigB = "B";
const sigC = "C";

hiphop module prg() {
   inout A, B, C;
   
   fork {
      loop {
	 if (this[sigB].nowval > 3) emit ${sigA}();
	 yield;
      }
   } par {
      loop {
	 if (this[sigC].now) {
	    emit ${sigB}(4);
	 } else {
	    emit ${sigB}(3);
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

