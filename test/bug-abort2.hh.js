"use @hop/hiphop"
"use hopscript"

import { ReactiveMachine } from "@hop/hiphop";

hiphop module prg() {
   in A;
   out C;
   out D;

   abort (A.now) {
      ;
   }
   emit C(123);
   yield;
   emit D(456);
}

export const mach = new ReactiveMachine(prg);
mach.outbuf = "";
mach.addEventListener("C", e => mach.outbuf += ("C: " + e.nowval + "\n"));
mach.addEventListener("D", e => mach.outbuf += ("D: " + e.nowval + "\n"));
mach.outbuf += ("1\n");
mach.react({});
mach.outbuf += ("2\n");
mach.react({A:111});
mach.outbuf += ("3\n");
mach.react();
mach.outbuf += ("4\n");
mach.react();
mach.outbuf += ("5\n");
