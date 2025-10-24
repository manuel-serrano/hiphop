// pre and preval property accesses where not correctly collected for
// signal aliases
import * as hh from "@hop/hiphop";

hiphop module bug() {
   in t;

   if (t.preval) {
      pragma { mach.outbuf += (t.preval + "\n"); }
   } else {
      pragma { mach.outbuf += "not preval\n"; }
   }
}

hiphop module main() {
   in time;

   run bug() { time as t }
}

export const mach = new hh.ReactiveMachine(main);
mach.outbuf = "";

mach.react();
mach.react();
mach.react();


