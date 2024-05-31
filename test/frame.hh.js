"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

// modules with and without parameters (i.e., frames) should behave the same
// this test is not correct, it does not test the bug fixed by forcing
// all modules to declare a frame.

let x1 = "nok\n";

hiphop module m1(a) {
   pragma {
      mach.outbuf += ("m1: " + x1);
   }
}

x1 = "ok\n";

let x2 = "nok\n";

hiphop module m2() {
   pragma {
      mach.outbuf += ("m2: " + x2);
   }
}

x2 = "ok\n";

const prg = hiphop module() {
   run m1(3) {};
   run m2() {};
}

export const mach = new hh.ReactiveMachine(prg, "frame");
mach.outbuf = "";

mach.react();
