"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   inout I; inout O;
   yield;
   suspend from( I.now ) to( O.now ) {
      loop {
	 hop { mach.outbuf += "ploup!\n"; }
	 yield;
      }
   }
}

export const mach = new hh.ReactiveMachine( prg );
mach.debug_emitted_func = v => mach.outbuf += v + "\n";

mach.react();
mach.react();
mach.outbuf += "--";
mach.inputAndReact( "I" );
mach.react();
mach.react();
mach.react();
mach.outbuf += "--";
mach.inputAndReact( "O" );
mach.react();
mach.react();
mach.react();
mach.outbuf += "--";
mach.inputAndReact( "I" );
mach.react();
