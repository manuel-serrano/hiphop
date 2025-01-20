"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg(resolve) {
   signal A;

   async (A) {
      this.notify(123456789);
   }

   if (A.nowval) {
      pragma { console.log(mach.age(), "ok"); }
   }
}

export const mach = new hh.ReactiveMachine(prg, { sweep: true, dumpNets: true, verbose: 1 });

mach.react();
mach.react();
//mach.react({A: 4});
