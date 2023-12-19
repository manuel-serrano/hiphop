import * as hh from "@hop/hiphop";

hiphop module prg() {
   inout A, B;
   EXIT: fork {
      await(A.now);
      hop { mach.outbuf += "A\n"; }
      break EXIT;
   } par {
      await(B.now);
      hop { mach.outbuf += "B\n"; }
      break EXIT;
   }

   hop { mach.outbuf += "end\n"; }
}

export const mach = new hh.ReactiveMachine(prg);
mach.outbuf = "";

mach.react();
mach.inputAndReact("B");
