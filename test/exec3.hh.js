import * as hh from "@hop/hiphop";
import { format } from "util";

hiphop module prg(resolve) {
   out O;
   async (O) {
      this.notify(new Promise(function(resolve, reject) {
	 setTimeout(() => resolve(5), 100);
      }));
   }
   pragma { resolve(false); }
}

export const mach = new hh.ReactiveMachine(prg, "exec");

mach.addEventListener("O", function(evt) {
   mach.outbuf += ("O=" + evt.nowval.val + " emitted!") + "\n";
});
mach.batchPromise = new Promise((res, rej) => mach.init(res));
mach.debug_emitted_func = val => val;

mach.outbuf = "";
mach.react();
