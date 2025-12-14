import * as hh from "@hop/hiphop";

const events = [{"I":56},{}];

const prg = hiphop module() {
   inout I, O;
   fork {
      pragma { mach.outbuf += ("O " + mach.age() + "\n"); }
   } par {
      yield;
   }
   pragma { mach.outbuf += ("L "+ mach.age() + "\n"); }
}

const opts = {"name":"rnc", native: false};
export const mach = new hh.ReactiveMachine(prg, opts);
mach.outbuf = "";

events.forEach((e, i) => {
   mach.react();
});
