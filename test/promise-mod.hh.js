import * as hh from "@hop/hiphop";
import { promise } from "@hop/hiphop/modules/promise.js";
import { format } from "util";


hiphop module prg(resolve) {
   out STATUS;
   signal v;

   fork {
      run promise(new Promise((res, rej) => res(45))) { v as value };
   } par {
      await (v.now);
      emit STATUS(v.nowval.res);
   }

   pragma { resolve(false); }
}

export const mach = new hh.ReactiveMachine(prg);
mach.outbuf = "";
mach.debug_emitted_func = emitted => {
   mach.outbuf += format(emitted) + "\n";
};
mach.batchPromise = new Promise((res, rej) => mach.init(res));

mach.react();
