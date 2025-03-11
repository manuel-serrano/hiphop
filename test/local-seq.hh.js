import * as hh from "@hop/hiphop";

const prg = hiphop module() {
   {
      signal L;

      emit L("L");
      yield;
      pragma { mach.outbuf += "L1\n"; }
   }
   {
      signal L2;

      emit L2("L2");
      yield;
      pragma { mach.outbuf += "L2\n"; }
   }
}
 
export const mach = new hh.ReactiveMachine(prg, "local-seq");
mach.outbuf = "";

mach.react();
mach.react();
mach.react();
mach.react();
