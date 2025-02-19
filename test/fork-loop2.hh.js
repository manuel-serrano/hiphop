import * as hh from "@hop/hiphop";

const prg = hiphop module() {
   loop {
      fork {
	 pragma { mach.outbuf += ("S1\n"); }
      } par {
         fork {
	    pragma { mach.outbuf += ("S2\n"); }
	    yield;
         } par {
	    pragma { mach.outbuf += ("else\n"); }
         }
      }
   }
}
 
export const mach = new hh.ReactiveMachine(prg, "FORK-LOOP2");
mach.outbuf = "";

mach.react();
mach.react();
mach.react();
mach.react();
