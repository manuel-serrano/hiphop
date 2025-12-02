import * as hh from "@hop/hiphop";

let cnt = 0;

function output(msg) {
   mach.outbuf += msg;
}

export const mach = new hh.ReactiveMachine(
   hiphop module(resolve) {
      inout S;
      every (S.now) {
	 pragma { output("every\n") };
	 async () {
	    output("start\n");
	    setTimeout(this.notify.bind(this), 200);
	 } kill {
	    output("killed\n");
	 }
	 pragma { resolve(false); }
      }
  });

mach.batchPromise = new Promise((res, rej) => mach.init(res));
mach.debug_emitted_func = emitted => {
}

mach.outbuf = "";
mach.react();
output("----\n");
mach.react("S");
output("----\n");
setTimeout((() => mach.react("S")), 50);
