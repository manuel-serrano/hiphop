"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

const prg = hiphop module() {
   in S, T;

   await (S.now && S.nowval);
   host { mach.outbuf += "S\n"; }
   await (T.now && T.nowval.len > 3);
   host { mach.outbuf += "T\n"; }
}

export const mach = new hh.ReactiveMachine(prg, "DELAY");
mach.outbuf = "";


