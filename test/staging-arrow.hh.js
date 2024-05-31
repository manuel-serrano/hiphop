"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

const prg = hiphop module() {

   ${(() => hiphop {
      pragma {
	 mach.outbuf += "ok1\n";
      }
   })()}
   
   ${(() => {
      let i = 0;
      return hiphop {
         pragma {
	    mach.outbuf += "ok2\n";
         }
      }
   })()}
}

export const mach = new hh.ReactiveMachine(prg, "staging-arrow");
mach.outbuf = "";

mach.react();
