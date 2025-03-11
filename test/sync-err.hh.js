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
      }
   }
}

export const mach = new hh.ReactiveMachine( prg, "sync-err" );
mach.outbuf = "";

try {
   mach.react();
   mach.react();
   mach.react();
   mach.react();
} catch( e ) {
   mach.outbuf += "error!" + "\n";
}
