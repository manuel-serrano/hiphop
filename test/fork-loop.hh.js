import * as hh from "@hop/hiphop";

  const prg = hiphop module() {
   in A, B, R; out O;

   loop {
      pragma { mach.outbuf += ("loop " + mach.age() + "\n"); }
      fork {
	 pragma { mach.outbuf += ("S1\n"); }
      }
     yield;
   }
}
 
export const mach = new hh.ReactiveMachine(prg, "FORK-LOOP");
mach.outbuf = "";

mach.react();
mach.react();
mach.react();
mach.react();
