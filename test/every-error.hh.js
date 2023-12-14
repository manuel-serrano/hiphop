"use hopscript"

import * as hh from "@hop/hiphop";

export let mach = new hh.ReactiveMachine(hiphop module () {});
mach.outbuf = "";

try {
   const prg = hiphop module( I, O ) {
      every immediate count( 2, now( I ) ) {
	 emit O();
      }
   }
   mach = new hh.ReactiveMachine(prg);
} catch( e ) {
   mach.outbuf += ( e.message ) + "\n";
}
