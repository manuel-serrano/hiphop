"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   inout A, B;
   EXIT: fork {
      await( A.now );
      hop { mach.outbuf += "A"; }
      break EXIT;
   } par {
      await( B.now );
      hop { mach.outbuf += "B"; }
      break EXIT;
   }

   hop { mach.outbuf += "end"; }
}

export const mach = new hh.ReactiveMachine( prg );

mach.react();
mach.inputAndReact( "B" );
