"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";
export const mach = new hh.ReactiveMachine(
   hiphop module() {
      inout S;
      every (S.now) {
	 host { mach.outbuf += ("every") + "\n" };
	 async () {
	    mach.outbuf += ("start " + this.id) + "\n";
	    setTimeout(this.notify.bind(this), 500);
	 } kill {
	    mach.outbuf += ("killed " + this.id) + "\n";
	 }
      }
   });

mach.outbuf = "";
mach.react();
mach.outbuf += ('----') + "\n";
mach.inputAndReact("S");
mach.outbuf += ('----') + "\n";
setTimeout(() => mach.inputAndReact("S"), 200);
