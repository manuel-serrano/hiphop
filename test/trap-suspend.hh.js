import * as hh from "@hop/hiphop";

export const mach = new hh.ReactiveMachine(
   hiphop module() {
      in L;
      T1: fork {
	 break T1;
      } par {
	 suspend {
	    yield;
	 } when (L.now)
      }
      pragma { mach.outbuf += "exit trap\n"; }
   } );

mach.outbuf = "";
mach.react();
