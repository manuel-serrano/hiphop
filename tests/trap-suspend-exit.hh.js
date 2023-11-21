"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   in V_S_p;
   T1: suspend( V_S_p.now ) {
      break T1;
   }
}

export const mach = new hh.ReactiveMachine( prg, "TEST" );

mach.debug_emitted_func = v => mach.oubuf += v + "\n";
mach.react();
mach.react();
