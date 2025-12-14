import * as hh from "@hop/hiphop";

const events = [{},{},null,{},{"g49906":21},null,{"g49906":14},{"g49906":57}];

const prg = hiphop module() {
   inout g49906 combine (x, y) => (x + y);
   do {
      signal g49909 combine (x, y) => (x + y);
      if (g49909.pre) {
	 ;
      } else {
         emit g49909(21);
         yield;
      }
   } every (g49906.now);
}

const opts = {"name":"default","native":false};
export const mach = new hh.ReactiveMachine(prg, opts);
mach.outbuf = "";

events.forEach((e, i) => {
   mach.outbuf += (mach.name() + '[' + i + ']: '
      + JSON.stringify(mach.reactDebug(e)) + '\n')
});

