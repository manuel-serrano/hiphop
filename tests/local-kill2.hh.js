"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";
import { format } from "util";

export const mach = new hh.ReactiveMachine(
   hiphop module() {
      inout A;
      T: fork {
	 loop {
	    let tmt;

	    async () {
	       tmt = setTimeout(this.notify.bind(this), 1000);
	    } kill {
	       mach.outbuf += ("killed") + "\n";
	       clearTimeout(tmt);
	    }

	    host { mach.outbuf += ('tick 10s') + "\n" }
	 }
      } par {
	 async () {
	    setTimeout(this.notify.bind(this), 50);
	 }
	 break T;
      }

      emit A();
   });

mach.outbuf = "";
mach.debug_emitted_func = emitted => {
   mach.outbuf += format(emitted) + "\n";
};

mach.react();
