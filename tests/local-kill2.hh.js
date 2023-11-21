"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

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

	    hop { mach.outbuf += ('tick 10s') + "\n" }
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
mach.debug_emitted_func = val => {
   mach.outbuf += (val.toString() ? "[ '" + val + "' ]\n" : "[]\n");
}
mach.react();
