"use hopscript"

import * as hh from "@hop/hiphop";

export let mach = new hh.ReactiveMachine(hiphop module () {});
mach.outbuf = "";

try {
   hiphop module prg( I, O ) {
      every immediate count( 2, now( I ) ) {
	 emit O();
      }
   }
   mach = new hh.ReactiveMachine(prg);
} catch( e ) {
   mach.outbuf += ( e.message ) + "\n";
}
