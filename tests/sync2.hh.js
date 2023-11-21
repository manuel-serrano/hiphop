"use @hop/hiphop";
"use strict";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   out O;
   signal L;

   fork {
      loop {
	 emit L();
	 yield;
      }
   } par {
      loop {
	 await immediate( L.now );
	 emit O();
	 yield;
      }
   }
}

export const mach = new hh.ReactiveMachine( prg, "sync2" );
mach.debug_emitted_func = console.log;

mach.react()
mach.react()
mach.react()
mach.react()
