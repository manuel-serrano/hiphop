"use @hop/hiphop"
"use hopscript"

import * as hh from "@hop/hiphop";

export const mach = new hh.ReactiveMachine(
   hiphop module() {
      inout A;
      T: fork {
	 loop {
	    async () {
	       setTimeout( this.notify.bind(this), 100);
	    } kill {
	       mach.outbuf += ("killed") + "\n";
	    }

	    host { mach.outbuf += ('tick 10s') + "\n" }
	 }
      } par {
	 async () {
	    setTimeout(this.notify.bind(this), 10);
	 }
	 break T;
      }

      emit A();
      host { mach.outbuf += ("end") + "\n" } } );

mach.outbuf = "";
mach.debug_emitted_func = emitted => {
   mach.outbuf += format(emitted) + "\n";
};

mach.react();
