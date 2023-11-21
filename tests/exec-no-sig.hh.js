"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   out O, OT;
   fork {
      async () {
	 console.log("Oi.");
	 setTimeout(() => {
	    console.log("Oi timeout.");
	    this.notify(5, false);
	 }, 3000);
      }
      emit OT();
   } par {
      emit O();
   }
}

export const mach = new hh.ReactiveMachine(prg, "exec");
mach.outbuf = "";
mach.debug_emitted_func = val => {
   mach.outbuf += (val.toString() ? "[ '" + val + "' ]\n" : "[]\n");
}

mach.react();
mach.react();
mach.react();
mach.outbuf +=  ".......\n";
setTimeout(function() {
   mach.react()
   mach.react()
}, 5000);

