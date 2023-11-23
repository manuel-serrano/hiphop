"use @hop/hiphop";
"use hopscropt";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   inout A, B;
   emit A(), B();
}

export const mach = new hh.ReactiveMachine( prg );
mach.outbuf = "";
mach.debug_emitted_func = val => {
   mach.outbuf += (val.toString() ? "[ '" + val + "' ]\n" : "[]\n");
}

mach.react()
mach.react()
