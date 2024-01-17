"use @hop/hiphop"
"use hopscript"

import { ReactiveMachine } from "@hop/hiphop";

hiphop module prg() {
   signal S;
   signal T transient;

   fork {
      emit S(1);
      emit T(2);
      yield;
      emit S(10);
      emit T(11);
      yield;
      yield;
      yield;
      yield;
      emit S(20);
      yield;
      emit S(30);
      emit T(31);
   } par {
      loop {
	 pragma {
	    mach.outbuf += ("S=" + S.now +" " + S.nowval + " " + S.preval) + "\n";
	    mach.outbuf += ("T=" + T.now +" " + T.nowval + " " + T.preval) + "\n";
	 }
	 yield;
      }
   }
}

export const mach = new ReactiveMachine(prg);
mach.outbuf = "";

mach.react();
mach.react();
mach.react();
mach.react();
mach.react();
mach.react();
mach.react();
mach.react();
mach.react();
