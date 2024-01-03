import * as hh from "@hop/hiphop";

export const mach = new hh.ReactiveMachine(
   hiphop module(resolve) {
      T: fork {
	 async () {
	    setTimeout(this.notify.bind(this), 500);
	 }
	 break T;
      } par {
      	 async () {
	    setTimeout(this.notify.bind(this), 1000);
	 } kill {
	    mach.outbuf = ("been killed\n");
	 }
      }
      pragma { resolve(false); }
   });

mach.outbuf = "";
mach.batchPromise = new Promise((res, rej) => mach.init(res));
mach.react();
