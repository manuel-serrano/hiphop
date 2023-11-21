"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   in I; inout X, Y;
   emit Y();
}

export const mach = new hh.ReactiveMachine( prg );
mach.debug_emitted_func = val => {
   mach.outbuf += (val.toString() ? "[ '" + val + "' ]\n" : "[]\n");
}

mach.inputAndReact( "I" );
mach.inputAndReact( "X", 15 );
mach.react();
mach.inputAndReact( "Y" );
