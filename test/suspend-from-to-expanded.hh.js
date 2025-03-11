"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";
import { format } from "util";

hiphop module prg() {
   inout I; inout O;
   yield;
   signal SUSPEND_CONTINUOUS;
   END_BODY: fork {
      suspend immediate (SUSPEND_CONTINUOUS.now) {
	 loop {
	    pragma { mach.outbuf += "ploup!\n"; }
	    yield;
	 }
      }
      break END_BODY;
   } par {
      every (I.now) {
	 abort (O.now) {
	    fork {
	       sustain SUSPEND_CONTINUOUS();
	    }
	 }
      }
   }
}

export const mach = new hh.ReactiveMachine( prg );
mach.outbuf = "";
mach.debug_emitted_func = emitted => {
   mach.outbuf += format(emitted) + "\n";
}

mach.react();
mach.react();
mach.outbuf += "--\n";
mach.react("I");
mach.react();
mach.react();
mach.react();
mach.outbuf += "--\n";
mach.react("O");
mach.react();
mach.react();
mach.react();
mach.outbuf += "--\n";
mach.react("I");
mach.react();
