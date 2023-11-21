"use @hop/hiphop"
"use hopscript"

import * as hh from "@hop/hiphop";

export let mach; 
try {
   hiphop module prg() {
      out O = 0;
      emit O( O.nowval );
   }
   mach = new hh.ReactiveMachine(prg);
} catch( e ) {
   console.log( "error: self update" );
}
