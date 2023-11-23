"use @hop/hiphop"
"use hopscript"

import * as hh from "@hop/hiphop";

export let mach = new hh.ReactiveMachine(hiphop module () {});
mach.outbuf = "";

try {
   hiphop module prg() {
      out O = 0;
      emit O( O.nowval );
   }
   mach = new hh.ReactiveMachine(prg);
} catch( e ) {
   mach.outbuf += ( "error: self update" ) + "\n";
}
