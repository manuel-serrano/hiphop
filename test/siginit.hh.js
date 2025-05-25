import * as hh from "@hop/hiphop";

hiphop module prg() {
   signal A = 20;

   yield;
   emit A(10);
   if (A.now) {
   } else {
      pragma { mach.outbuf += "should not be here"; }
   }
}


export const mach = new hh.ReactiveMachine(prg);
mach.outbuf = "init\n";
mach.react({});
mach.react({});
