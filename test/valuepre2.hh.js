"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   in I = 1; out O;
   emit O(I.nowval + I.preval);
   yield;
   emit O(I.nowval + I.preval);
}

export const mach = new hh.ReactiveMachine(prg, "valuepre2");
