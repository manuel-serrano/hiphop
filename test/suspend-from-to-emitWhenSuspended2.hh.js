import * as hh from "@hop/hiphop";
import { format } from "util";

export const mach = new hh.ReactiveMachine(
   hiphop module() {
      inout S, R, E;
      loop {
	 suspend {
	    pragma { mach.outbuf += "not suspended!\n" }
	 } from immediate( S.now ) to immediate( R.now ) emit E()
	 yield;
      }
   } );

mach.outbuf = "";
mach.debug_emitted_func = emitted => {
   mach.outbuf += format(emitted) + "\n";
   mach.outbuf += "---------------------\n";
};

mach.react()
mach.react()
mach.react({S: undefined});
mach.react()
mach.react()
mach.react({R: undefined});
mach.react()
mach.react()
