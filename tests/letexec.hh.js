"use @hop/hiphop"
"use hopscript"

import * as hh from "@hop/hiphop";

export const mach = new hh.ReactiveMachine(
   hiphop module() {
      inout G = 6;
      signal S = 5;

      async () {
	 mach.outbuf += (S.nowval + " " + G.nowval) + "\n";
      }
   })

mach.outbuf = "";
mach.react();
