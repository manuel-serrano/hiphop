"use @hop/hiphop"
"use hopscript"

import { ReactiveMachine } from "@hop/hiphop";

hiphop module prg() {
   in A;
   out B, C;

   abort (A.now) {
      ;
   }
   emit C(123);
}

export const mach = new ReactiveMachine(prg);
mach.outbuf = "";
mach.addEventListener("C", e => mach.outbuf += ("got C: " + e.nowval));
mach.addEventListener("B", e => mach.outbuf +=("got B: "+ e.nowval));
mach.outbuf += ("1");
mach.react({});
mach.outbuf += ("2");
mach.react({A:111});
mach.outbuf += ("3");
