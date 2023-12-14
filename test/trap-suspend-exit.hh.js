"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";
import { format } from "util";

hiphop module prg() {
   in V_S_p;
   T1: suspend(V_S_p.now) {
      break T1;
   }
}

export const mach = new hh.ReactiveMachine( prg, "TEST" );
mach.outbuf = "";

mach.debug_emitted_func = emitted => {
   mach.outbuf += format(emitted) + "\n";
};

mach.react();
mach.react();
