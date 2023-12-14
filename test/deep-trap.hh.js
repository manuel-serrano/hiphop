"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   t: {
      t2: {
	 break t2;
      }
      hop { mach.outbuf += ( "first level" ) + "\n" };
   }
   hop { mach.outbuf += ( "top level" ) + "\n" };
}

export const mach = new hh.ReactiveMachine( prg );

mach.outbuf = "";
mach.react();
