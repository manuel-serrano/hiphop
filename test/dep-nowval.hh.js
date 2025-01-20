"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg(resolve) {
   in A;

   async (A) {
      this.notify(123456789);
   }

   if (A.nowval) {
      pragma { mach.outbuf += (mach.age() + " ok\n"); }
   }
}

export const mach = new hh.ReactiveMachine(prg, { sweep: true, verbose: 0 });
mach.outbuf = "";
mach.react();
mach.react();
