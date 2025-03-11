import * as hh from "@hop/hiphop";
import { format } from "util";

let glob = 5;

hiphop module prg(resolve) {
   in R; out O; out OT; in T; in E;
   fork {
   do {
      fork {
	 abort(R.now) {
	    async (T) {
	       mach.outbuf += ("Oi.") + "\n";
	       setTimeout(function(self) {
		  mach.outbuf += ("Oi timeout.") + "\n";
		  self.notify(glob++ , false);
		 }, 100, this);
	    }
	 }
	 emit OT(T.nowval);
      } par {
	 emit O();
      }
   } every (R.now);
   } par {
      await (E.now);
      pragma { resolve(false); }
   }
}

export const mach = new hh.ReactiveMachine(prg, "exec");
mach.outbuf = "";
mach.debug_emitted_func = val => {
   mach.outbuf += format(val) + "\n";
}
mach.batchPromise = new Promise((res, rej) => mach.init(res));

mach.react()

setTimeout(function() {
   mach.react("R")
}, 100);

setTimeout(function() {
   mach.react()
}, 500);

setTimeout(function() {
   mach.react({E: true})
}, 900);

