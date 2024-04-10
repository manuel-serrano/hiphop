import * as hh from "@hop/hiphop";
import { timeout, Timeout } from "@hop/hiphop/modules/promise.js";
import { statfs } from 'node:fs/promises';

hiphop module prg(resolve) {
   out STATUS;
   signal value;
   
   run promise(statfs(".")) { * };

   emit status(value.nowval.rej === false);
   pragma { resolve(false); }
}

export const mach = new hh.ReactiveMachine(prg);
mach.batchPromise = new Promise((res, rej) => mach.init(res));

mach.react();
mach.react();

