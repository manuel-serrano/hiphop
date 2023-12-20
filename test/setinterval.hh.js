import * as hh from "@hop/hiphop";
import { format } from "util";

hiphop module setinterval(resolve) {
   inout A, Tick;
   fork {
      abort count(3, Tick.now) {
	 async (A) {
	    this.tmt = setInterval(() => this.react(Tick.signame), 100);
	 } kill {
	    clearInterval(this.tmt);
	 }
      }
   }
   pragma { resolve(false); }
};
   
export const mach = new hh.ReactiveMachine(setinterval);

mach.outbuf = "";
mach.debug_emitted_func = val => {
   mach.outbuf += format(val) + "\n";
}
mach.batchPromise = new Promise((res, rej) => mach.init(res));

mach.react();
