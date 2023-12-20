"use @hop/hiphop"
"use hopscript"

import * as hh from "@hop/hiphop";
import { format } from "util";

export const mach = new hh.ReactiveMachine(
   hiphop module(resolve) {
      inout A;
      T: fork {
	 loop {
	    async () {
	       setTimeout( this.notify.bind(this), 100);
	    } kill {
	       mach.outbuf += ("killed") + "\n";
	    }

	    pragma { mach.outbuf += ('tick 10s') + "\n" }
	 }
      } par {
	 async () {
	    setTimeout(this.notify.bind(this), 10);
	 }
	 break T;
      }

      emit A();
      pragma { mach.outbuf += ("end") + "\n" }
      pragma { resolve(false); }
   });

mach.outbuf = "";
mach.debug_emitted_func = emitted => {
   mach.outbuf += format(emitted) + "\n";
};

mach.batchPromise = new Promise((res, rej) => mach.init(res));
mach.react();
