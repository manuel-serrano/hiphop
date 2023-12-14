"use @hop/hiphop";
"use hopscript";

import {ReactiveMachine} from "@hop/hiphop";

hiphop module M1() {
   out a;
   emit a(100);
   async (a) {
      this.notify(10);
   }
}

hiphop module main() {
   out a, b;
   run M1() { b as a };
   yield;
   run M1() { a };
}

export const mach = new ReactiveMachine(main, "exec-module");
mach.outbuf = "";

mach.addEventListener("a", e => mach.outbuf += ("a= " + e.nowval) + "\n");
mach.addEventListener("b", e => mach.outbuf += ("b= " + e.nowval) + "\n");

mach.react();
mach.react();
mach.react();
mach.react();
mach.react();
mach.react();
mach.react();
mach.react();
