"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg(resolve) {
   out O, OT;
   fork {
      async () {
	 mach.outbuf += "Oi.\n";
	 setTimeout(() => {
	    mach.outbuf += "Oi timeout.\n";
	    this.notify(5, false);
	 }, 100);
      }
      emit OT();
   } par {
      emit O();
   }
   pragma { resolve(false); }
}

export const mach = new hh.ReactiveMachine(prg, "exec");
mach.outbuf = "";
mach.debug_emitted_func = emitted => {
   mach.outbuf += format(emitted) + "\n";
};

mach.debug_emitted_func = val => {
   mach.outbuf += (val.toString() ? "[ '" + val + "' ]\n" : "[]\n");
}
mach.batchPromise = new Promise((res, rej) => mach.init(res));

mach.react();
mach.react();
mach.react();
mach.outbuf +=  ".......\n";
setTimeout(function() {
   mach.react()
   mach.react()
}, 200);

