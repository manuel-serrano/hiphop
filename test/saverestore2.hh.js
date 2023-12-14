"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";
import { format } from "util";

hiphop module prg() {
   inout I; out O = 5; out U;
   loop {
      emit I(3);
      emit O(I.nowval);
      emit U(O.preval);
      yield;
   }
}

export const mach = new hh.ReactiveMachine(prg, "valuepre1");

mach.outbuf = "";
mach.debug_emitted_func = val => {
   mach.outbuf += format(val) + "\n";
}

let state1 = mach.save();
let state2 = null;
let state3 = null;

mach.react()
state2 = mach.save();

mach.react()
state3 = mach.save();

mach.react()
mach.restore(state1);

mach.react()
mach.react()

mach.restore(state1);

mach.react()
mach.react()

mach.restore(state2);

mach.react()
mach.react()

mach.restore(state3);

mach.react()
mach.react()

mach.restore(state1);

mach.react()
