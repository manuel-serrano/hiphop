"use hopscript"

import * as hh from "@hop/hiphop";

hiphop module example() {
   in I;
   out O;
   loop {
      if (O.now) emit I();
      emit O();
      yield;
   }
}

export const mach = new hh.ReactiveMachine(example, {name: "causality-error", verbose: -1});
mach.outbuf = "";

try {
   mach.react();
   mach.react();
   mach.react();
   mach.react();
   mach.react();
} catch (e) {
   mach.outbuf += "*** CAUSALITY ERROR\n";
}
