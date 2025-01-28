import * as hh from "@hop/hiphop";

hiphop module p8a() {
   inout I; inout O;
   T: {
      fork {
         if (!I.nowval) {
            yield;
         }
         emit O();
      } par {
         if (O.nowval) {
            break T;
         }
      }
   }
   emit O();
}

export const mach = new hh.ReactiveMachine(p8a, "value2");
mach.outbuf = "";

mach.addEventListener("O", e => mach.outbuf += ("O:" + e.signame + "\n"));

mach.react();
mach.react({I: 1});
mach.react();

