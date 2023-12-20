"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   out O1; out O2;
   out OUTER = 0;
   pragma { mach.outbuf += ("dans atom") + "\n" }
   emit O1((mach.outbuf += ("emit o1") + "\n", OUTER.nowval));
   pragma { mach.outbuf += ("apres atom") + "\n" }
   emit OUTER(1);
   emit O2(OUTER.nowval);
}

export const mach = new hh.ReactiveMachine(prg, {name: "TEST", verbose: -1});
mach.outbuf = "";

try {
   mach.react();
} catch(e) {
    mach.outbuf += ("causality error") + "\n";
}
