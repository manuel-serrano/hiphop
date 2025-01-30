"use @hop/hiphop"
"use hopscript"

import { ReactiveMachine } from "@hop/hiphop";

hiphop module prg() {
   in A;
   out C;

   abort (A.now) {
      ;
   }
   emit C(123);
}

export const mach = new ReactiveMachine(prg);
mach.outbuf = "";
mach.addEventListener("C", e => mach.outbuf += ("C: " + e.nowval + "\n"));
mach.outbuf += ("1\n");
mach.react({});
mach.outbuf += ("2\n");
mach.react({A:111});
mach.outbuf += ("3\n");
