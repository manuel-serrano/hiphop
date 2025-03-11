import * as hh from "@hop/hiphop";

export const mach = new hh.ReactiveMachine(
   hiphop module(resolve) {
      inout S;
      every (S.now) {
	 pragma { mach.outbuf += ("every") + "\n" };
	 async () {
	    mach.outbuf += ("start") + "\n";
	    setTimeout(this.notify.bind(this), 200);
	 } kill {
	    mach.outbuf += ("killed") + "\n";
	 }
	 pragma { resolve(false); }
      }
  });

mach.batchPromise = new Promise((res, rej) => mach.init(res));
mach.outbuf = "";
mach.react();
mach.outbuf += ('----') + "\n";
mach.react("S");
mach.outbuf += ('----') + "\n";
setTimeout((() => mach.react("S")), 50);

