"use @hop/hiphop"
"use hopscript"

import * as hh from "@hop/hiphop";

hiphop module prg(resolve) {
   out O;
   async (O) {
      setTimeout(() => this.notify(5), 100);
   }
   host { resolve(false); }
}

export const mach = new hh.ReactiveMachine(prg, "exec");
mach.outbuf = "";
mach.addEventListener("O", function(evt) {
   mach.outbuf += ("O emitted!") + "\n";
});
mach.debug_emitted_func = val => val;
mach.batchPromise = new Promise((res, rej) => mach.init(res));

mach.react();
