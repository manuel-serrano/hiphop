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

const m = new hh.ReactiveMachine(prg, "variable");
exports.prg = prg;

m.react()
m.inputAndReact("sig", 0);
m.inputAndReact("sig", 10);
