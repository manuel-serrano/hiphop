"use @hop/hiphop";
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
	 await( L.now );
	 emit O();
      }
   }
}

export const mach = new hh.ReactiveMachine( prg, "sync1" );
mach.debug_emitted_func = console.log;

mach.react()
mach.react()
mach.react()
mach.react()
