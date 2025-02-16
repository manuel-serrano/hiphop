"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prog() {
   inout toggle;
   
   suspend toggle (toggle.now) {
      loop {
	 pragma { mach.outbuf += "plop\n"; }
	 yield;
      }
   }
}

export const mach = new hh.ReactiveMachine(prog);
mach.outbuf = "";
mach.debug_emitted_func = val => {
   mach.outbuf += (val.toString() ? "[ '" + val + "' ]\n" : "[]\n");
}

mach.react();
mach.react();
mach.inputAndReact( 'toggle' );
mach.react();
mach.react();
mach.inputAndReact( 'toggle' );
mach.react();
mach.react();
