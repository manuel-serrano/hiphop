"use @hop/hiphop"
"use hopscript"

/* check if semantics of suspends / resume is correct when a task is over */

import * as hh from "@hop/hiphop";
import { format } from "util";

let glob = 5;

hiphop module prg(resolve) {
   in RESS; in S; out O; out OT; in T;
   fork {
      suspend (S.now) {
	 async (T) {
	    mach.outbuf += "Oi.\n";
	    setTimeout(function(self) {
	       mach.outbuf += "Oi timeout.\n";
	       console.log("TIMEOUT NOTIFY...");
	       self.notify(glob++, false);
	    }, 100, this);
	 } suspend {
	    console.log("suspend...");
	    mach.outbuf += "suspended.\n";
	 } resume {
	    console.log("resume...");
	    mach.outbuf += "resumed.\n";
	 }
      }
      host { console.log("EMITTING OT..."); }
      emit OT(T.nowval);
   } par {
      emit O();
   }

   host { console.log("LA.0.."); }
   await (RESS.now);
   emit OT(T.nowval);
   host { console.log("LA..."); }
   host { resolve(false); }
}

hiphop module prg2(resolve) {
   in RESS; in S; out O; out OT; in T;
   fork {
      run prg(resolve) { * };
   } par {
      let tick = 0;
      loop {
	 host {
	    console.log("---- t=", tick++, "RESS=",
			RESS.now, "S=", S.now,
			"O=", O.now, "OT=",
			OT.now, OT.nowval, "T=", T.now);
	 }
	 yield;
      }
   }
}
      
export const mach = new hh.ReactiveMachine(prg2, "exec");
mach.outbuf = "";
mach.debug_emitted_func = emitted => {
   mach.outbuf += format(emitted) + "\n";
}
mach.batchPromise = new Promise((res, rej) => mach.init(res));

mach.react();
mach.inputAndReact("S");
mach.inputAndReact("S");
mach.inputAndReact("S");
mach.inputAndReact("S");
mach.react();
mach.react();
mach.inputAndReact("S");
console.log("TOP LEVEL DONE");

setTimeout(function() {
   console.error("ICI0");
   mach.react();
   console.error("ICI1");
   mach.inputAndReact("RESS");
   console.error("ICI2");
   mach.inputAndReact("S");
   mach.react();
   console.error("ICI3");
}, 1000);

console.error("MS: FIX ME!!!!! (exec-susp-res.hh.js)");
