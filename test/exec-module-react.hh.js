"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module M1() {
   out a;
   emit a(100);
   async (a) {
      this.notify(10);
   }
}

hiphop module prg() {
   inout a, b;
   run M1() { b from a };
}

export const mach = new hh.ReactiveMachine(prg);
mach.outbuf = "";
mach.addEventListener("a", e => mach.outbuf += ("a= " + e.nowval) + "\n");
mach.addEventListener("b", e => mach.outbuf += ("b= " + e.nowval) + "\n");

mach.react();
mach.react();
