import * as hh from "@hop/hiphop";

hiphop module prg() {
   inout A, B;
   EXIT: fork {
      await(A.now);
      pragma { mach.outbuf += "A\n"; }
      break EXIT;
   } par {
      await(B.now);
      pragma { mach.outbuf += "B\n"; }
      break EXIT;
   }

   pragma { mach.outbuf += "end\n"; }
}

export const mach = new hh.ReactiveMachine(prg);
mach.outbuf = "";

mach.react();
mach.react({B: undefined});
