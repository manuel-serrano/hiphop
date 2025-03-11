import * as hh from "@hop/hiphop";
import { format } from "util";

hiphop module m1() {
   inout S, U, W, Z;
   fork {
      if (S.now) emit W();
   } par {
      if (U.now) emit Z();
   }
}

hiphop module run2() {
   inout S, U, A, B;
   fork "par" {
      run m1() { S, U, A as W, B as Z };
   } par {
      halt;
   }
}

export const mach = new hh.ReactiveMachine(run2, { name: "run-add-par", dynamic: true });
mach.outbuf = "";
mach.debug_emitted_func = val => {
   mach.outbuf += format(val) + "\n";
}

mach.outbuf += ("m.inputAndReact(S)") + "\n";
mach.react({S: undefined});

mach.getElementById("par").appendChild(hiphop run m1() { S, U, A as Z });

mach.outbuf += ("==================== ADD RUN PARALLEL ==================") + "\n";

mach.outbuf += ("m.inputAndReact(U)") + "\n";
mach.react({U: undefined});
