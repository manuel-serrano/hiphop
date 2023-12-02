"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";
import { format } from "util";

function foo(cb) {
   cb(4);
}

export const mach = new hh.ReactiveMachine(
   hiphop module() {
      out S;
      async (S) {
         setTimeout(this.notify.bind(this), 100, 5);
      }
   } );

mach.outbuf = "";
mach.debug_emitted_func = val => {
   mach.outbuf += format(val) + "\n";
}
mach.react()

