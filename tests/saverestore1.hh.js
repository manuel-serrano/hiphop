"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";
import { format } from "util";
function sum( arg1, arg2 ) {
   return arg1 + arg2;
}

hiphop module prg() {
   inout S1_and_S2, S1_and_not_S2, not_S1_and_S2, not_S1_and_not_S2;
   loop {
      T1: {
	 signal S1;

	 fork {
	    yield;
	    emit S1();
	    break T1;
	 } par {
	    loop {
	       T2: {
		  signal S2;
		  
		  fork {
		     yield;
		     emit S2();
		     break T2;
		  } par {
		     loop {
			if( S1.now ) {
			   if( S2.now ) {
			      emit S1_and_S2();
			   } else {
			      emit S1_and_not_S2();
			   }
			} else if( S2.now ) {
			   emit not_S1_and_S2();
			} else {
			   emit not_S1_and_not_S2();
			}
			yield;
		     }
		  }
	       }
	    }
	 }
      }
   }
}

export const mach = new hh.ReactiveMachine(prg, "P18");

let state = mach.save();
mach.outbuf = "";
mach.debug_emitted_func = val => {
   mach.outbuf += format(val) + "\n";
}

mach.react()

mach.restore(state);
mach.react()

mach.restore(state);
mach.react()

mach.restore(state);
mach.react()
