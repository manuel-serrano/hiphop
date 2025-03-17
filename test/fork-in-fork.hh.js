import * as hh from "@hop/hiphop";

const prg = hiphop module() {
   loop {
      fork {
         fork {
	    pragma { mach.outbuf += ("in fork\n"); }
	    yield;
	 }
      }
   }
}
 
export const mach = new hh.ReactiveMachine(prg, "FORK-IN-FORK");
mach.outbuf = "";

mach.react();
mach.react();
mach.react();
mach.react();
