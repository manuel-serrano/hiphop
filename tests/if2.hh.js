"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

let s1 = true;
let s2 = false;

hiphop module prgif2() {
   out O1, O2;
   loop {
      if (${s1}) emit O1();
      if (${s2}) emit O2();
      yield;
   }
}

export const mach = new hh.ReactiveMachine(prgif2);
mach.outbuf = "";
mach.debug_emitted_func = val => {
   mach.outbuf += (val.toString() ? "[ '" + val + "' ]\n" : "[]\n");
}

mach.react()
s1 = false; // does not change anything because ${s1} is compile-time
mach.react()
