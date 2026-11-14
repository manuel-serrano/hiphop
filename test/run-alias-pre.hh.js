import * as hh from "@hop/hiphop";

// A module reading v.preval, run twice with different signals bound
// to v. Each bound signal needs its own pre register (see addAlias in
// lib/circuit.js).
hiphop module sub() {
   inout v;
   loop {
      emit v(v.preval + 1);
      yield;
   }
}

hiphop module prg() {
   inout A = 0, B = 10;
   fork {
      run sub() { A as v };
   } par {
      run sub() { B as v };
   }
}

export const mach = new hh.ReactiveMachine(prg, "run-alias-pre");
mach.outbuf = "";
const val = {};
mach.addEventListener("A", evt => val.A = evt.nowval);
mach.addEventListener("B", evt => val.B = evt.nowval);

for (let i = 0; i < 3; i++) {
   mach.react();
   mach.outbuf += "A=" + val.A + " B=" + val.B + "\n";
}
