import * as hh from "@hop/hiphop";

hiphop module prg() {
   signal V_S_C, V_S_i;

   if (V_S_C.now) {
      ;
   }
   if (V_S_i.now) {
      emit V_S_C();
   }
   pragma {
      mach.outbuf = "ok\n";
   }
}

export const mach = new hh.ReactiveMachine(prg, { verbose: -1 });
mach.outbuf = "";

try {
   mach.react();
} catch(e) {
   mach.outbuf += ("causality error age=" + mach.age()) + "\n";
}
