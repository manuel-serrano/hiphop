import * as hh from "@hop/hiphop";
import { timeout, Timeout } from "@hop/hiphop/modules/timeout.js";

const delay = 100;

hiphop module prg(resolve) {
   out DUR;
   signal implements Timeout;
   let now0 = Date.now();

   fork {
      run timeout(delay) { * };
   } par {
      // pause the timer
      yield;
      emit pause(true);

      // wait for a an extra delay
      run timeout(delay) { };

      // resume the timer
      emit pause(false);
   } par {
      await immediate (elapsed.now);
   }

   emit DUR((Date.now() - now0) > delay);
   pragma { resolve(false); }
}

export const mach = new hh.ReactiveMachine(prg);
mach.batchPromise = new Promise((res, rej) => mach.init(res));

mach.react();
mach.react();
