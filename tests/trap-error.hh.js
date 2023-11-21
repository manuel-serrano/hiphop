"use @hop/hiphop";
"use hopscript"

import * as hh from "@hop/hiphop";

hiphop module sub() {
   break T;
}

hiphop module main( O, S ) {
   T: {
      run sub() {};
   }
}

prg = new hh.ReactiveMachine( main, "abort-error" );
export const mach = prg;


