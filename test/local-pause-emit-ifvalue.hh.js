"use @hop/hiphop"
"use hopscript"

import * as hh from "@hop/hiphop";

hiphop module prg() {
   loop {
      signal L;

      yield;
      emit L();
      if (!L.nowval) pragma { mach.outbuf += ("L: " + L.nowval) + "\n" }
   }
}

export const mach = new hh.ReactiveMachine(prg);
mach.outbuf = "";
mach.react();
mach.react();
mach.react();
mach.react();
