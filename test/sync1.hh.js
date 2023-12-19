import * as hh from "@hop/hiphop";
import { format } from "util";

hiphop module prg() {
   out O;
   signal L;

   fork {
      loop {
	 emit L();
	 yield;
      }
   } par {
      loop {
	 await(L.now);
	 emit O();
      }
   }
}

export const mach = new hh.ReactiveMachine(prg, "sync1");
mach.outbuf = "";
mach.debug_emitted_func = emitted => {
   mach.outbuf += format(emitted) + "\n";
};

mach.react()
mach.react()
mach.react()
mach.react()
