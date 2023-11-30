"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

const m = hiphop module(x) {
   out O;
   emit O(x);
}

const prg = hiphop module() {
   out O;
   run m(10) { * };
}

export const mach = new hh.ReactiveMachine(prg, "PARAM");


