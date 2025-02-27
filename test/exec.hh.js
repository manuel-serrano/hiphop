import * as hh from "@hop/hiphop";
import { format } from "util";

hiphop module prg(resolve) {
   in T; out O, OT;
   fork {
      async (T) {
	 mach.outbuf += ("Oi.") + "\n";
	 setTimeout(function(self) {
	    mach.outbuf += ("Oi timeout.") + "\n";
	    self.notify(5, false);
	 }, 100, this);
      }
      emit OT(T.nowval);
   } par {
      emit O();
   }
      pragma { resolve(false); }
}

export const mach = new hh.ReactiveMachine(prg, "exec");
mach.outbuf = "";
mach.debug_emitted_func = val => {
   mach.outbuf += format(val) + "\n";
}
mach.batchPromise = new Promise((res, rej) => mach.init(res));

mach.react()
mach.react()
mach.react()
mach.outbuf += ".......\n";
setTimeout(function() {
   mach.react()
   mach.react()
}, 500);

