"use @hop/hiphop"
"use hopscript"

import * as hh from "@hop/hiphop";

hiphop module prg() {
   in sig;
   let v = 1;

   every (sig.now) {
      if (sig.nowval > v) {
	 host { v = sig.nowval + 1 }
      }

      host { console.log("v=", v) }
      yield;
   }
}

export const mach = new hh.ReactiveMachine(prg, "variable");

mach.react()
mach.inputAndReact("sig", 0);
mach.inputAndReact("sig", 10);
