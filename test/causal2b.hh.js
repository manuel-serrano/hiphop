import * as hh from "@hop/hiphop";

let X = false;

// same as causal2 but if tests are non trivial so HipHop
// cannot transform them into plain dependency gates
hiphop module prg() {
   signal V_S_C, V_S_i;

   if (V_S_C.now && X) {
      ;
   }
   if (V_S_i.now && X) {
      emit V_S_C();
   }
   pragma {
      mach.outbuf = "ok\n";
   }
}

export const mach = new hh.ReactiveMachine(prg, { verbose: -1 });
mach.outbuf = "";

try {
   X = true;
   mach.react();
} catch(e) {
   mach.outbuf += ("causality error age=" + mach.age()) + "\n";
}
