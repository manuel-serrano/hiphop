"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";
export const mach = new hh.ReactiveMachine(
   hiphop module(resolve) {
      inout S;
      every (S.now) {
	 host { mach.outbuf += ("every") + "\n" };
	 async () {
	    mach.outbuf += ("start") + "\n";
	    setTimeout(this.notify.bind(this), 500);
	 } kill {
	    mach.outbuf += ("killed") + "\n";
	 }
      host { resolve(false); }
      }
  });

mach.batchPromise = new Promise((res, rej) => mach.init(res));
mach.outbuf = "";
mach.react();
mach.outbuf += ('----') + "\n";
mach.inputAndReact("S");
mach.outbuf += ('----') + "\n";
setTimeout((() => mach.inputAndReact("S")), 100);

