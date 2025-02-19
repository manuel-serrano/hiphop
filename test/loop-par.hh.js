import * as hh from "@hop/hiphop";

hiphop module prg() {
   loop {
      fork {
	 pragma { mach.outbuf += ("in loop " + mach.age() + "\n"); }
	 yield;
      } par {
	 pragma { ; }
      }
   }
}

export const mach = new hh.ReactiveMachine(prg, { dumpNets: false });
mach.outbuf = "";
mach.react({});
mach.react({});
