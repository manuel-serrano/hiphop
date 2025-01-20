import { ReactiveMachine } from "@hop/hiphop";
import * as hh from "@hop/hiphop";

hiphop module prg(resolve) {
   inout X = 1, Y, Z;
   T: {
      signal __internal = -1 combine (x, y) => x + y;

      loop {
         if (__internal.preval === -1) {
            emit __internal(X.nowval + 5);
         }
         if (__internal.nowval === 0) {
            break T;
         }
         async () {
            setTimeout(this.notify.bind(this), 10);
         }
         emit Y();
         emit __internal(__internal.preval - 1);
      }
   }
   emit Z();
   pragma { resolve(false); }
}

export const mach = new hh.ReactiveMachine(prg);
mach.outbuf = "";
mach.batchPromise = new Promise((res, rej) => mach.init(res));
mach.debug_emitted_func = val => val;

mach.addEventListener("Y", function(evt) {
   mach.outbuf += "Y emitted\n";
});

mach.addEventListener("Z", function(evt) {
   mach.outbuf += "Z emitted\n";
});

mach.react();
