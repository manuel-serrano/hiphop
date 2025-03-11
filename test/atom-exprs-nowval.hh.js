"use @hop/hiphop";
"use strict";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   loop {
      signal L;

      emit L("foo bar");
      yield;
      pragma { mach.outbuf += "atom works! value of L is " + L.nowval + "\n"; }
   }
}

export const mach = new hh.ReactiveMachine(prg, "atom");
mach.outbuf = "";

mach.outbuf += "---\n";
mach.react();
mach.outbuf += "---\n";
mach.react();
