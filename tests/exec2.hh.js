"use @hop/hiphop"
"use hopscript"

import * as hh from "@hop/hiphop";

hiphop module prg() {
   out O;
   async (O) {
      setTimeout(() => this.notify(5), 3000);
   }
}

export const mach = new hh.ReactiveMachine(prg, "exec");
mach.outbuf = "";
mach.addEventListener("O", function(evt) {
   mach.outbuf += ("O emitted!") + "\n";
});

mach.react();
