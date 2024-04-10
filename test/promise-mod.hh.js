import * as hh from "@hop/hiphop";
import { promise } from "@hop/hiphop/modules/promise.js";
import { statfs } from 'node:fs/promises';

hiphop module prg(resolve) {
   out STATUS;
   signal value;

   fork {
      run promise(statfs(".")) { * };
   } par {
      await (value.nowval);
      emit STATUS(value.nowval.rej === false);
   }
   pragma { resolve(false); }
}

export const mach = new hh.ReactiveMachine(prg);
mach.batchPromise = new Promise((res, rej) => mach.init(res));

mach.react();
mach.react();

