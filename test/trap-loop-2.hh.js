import * as hh from "@hop/hiphop";

const prg = hiphop module() {
   in A, B, R; out O;

   loop {
      pragma { mach.outbuf += ("loop " + mach.age() + "\n"); }
      T1: fork {
	 pragma { mach.outbuf += ("S1\n"); }
	 yield;
	 break T1;
      }
   }
}
 
export const mach = new hh.ReactiveMachine(prg, "TRAP-LOOP-2");
mach.outbuf = "";

mach.react();
mach.react();
mach.react();
mach.react();
