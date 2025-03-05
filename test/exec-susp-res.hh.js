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
	       self.notify(glob++, false);
	    }, 100, this);
	 } suspend {
	    mach.outbuf += "suspended.\n";
	 } resume {
	    mach.outbuf += "resumed.\n";
	 }
      }
   } par {
      emit O();
   }

   await (RESS.now);
   emit OT(T.nowval);
   pragma { resolve(false); }
}

export const mach = new hh.ReactiveMachine(prg, "exec");
mach.outbuf = "";
mach.debug_emitted_func = emitted => {
   mach.outbuf += format(emitted) + "\n";
}
mach.batchPromise = new Promise((res, rej) => mach.init(res));

mach.react();
mach.react("S");
mach.react("S");
mach.react("S");
mach.react("S");
mach.react();
mach.react();
mach.react("S");

setTimeout(function() {
   mach.react();
   mach.react();
   mach.react("RESS");
   mach.react("S");
   mach.react();
}, 100);

