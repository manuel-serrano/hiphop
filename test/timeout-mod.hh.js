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
      emit pause(true);

      // wait for a an extra delay
      {
	 signal implements Timeout;
	 run timeout(delay) { * };
      }

      // resume the timer
      emit pause(false);
   } par {
      await (elapsed.now);
   }

   emit 
}

export const mach = new hh.ReactiveMachine(prg);
mach.addEventListener("duration", function(evt) {
   process.exit(
mach.react();
