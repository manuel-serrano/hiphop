"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

const mach = new hh.ReactiveMachine(
   hiphop module() {
      inout A;
      T: fork {
	 loop {
	    let tmt;

	    async () {
	       tmt = setTimeout(this.notify.bind(this), 1000);
	    } kill {
	       console.log("killed");
	       clearTimeout(tmt);
	    }

	    hop { console.log('tick 10s') }
	 }
      } par {
	 async () {
	    setTimeout(this.notify.bind(this), 50);
	 }
	 break T;
      }

      emit A();
   });

mach.debug_emitted_func = console.log;

mach.react();
