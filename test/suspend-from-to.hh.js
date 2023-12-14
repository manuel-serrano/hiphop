"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";
import { format } from "util";

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
mach.outbuf = "";
mach.debug_emitted_func = emitted => {
   mach.outbuf += format(emitted) + "\n";
}

mach.react();
mach.react();
mach.outbuf += "--\n";
mach.inputAndReact( "I" );
mach.react();
mach.react();
mach.react();
mach.outbuf += "--\n";
mach.inputAndReact( "O" );
mach.react();
mach.react();
mach.react();
mach.outbuf += "--\n";
mach.inputAndReact( "I" );
mach.react();
