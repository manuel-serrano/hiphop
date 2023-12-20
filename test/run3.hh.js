import * as hh from "@hop/hiphop";
import { format } from "util";

const gameTimeout = 100;

function Timer(timeout) { 
   return hiphop module() {
      out tmt;
      async (tmt) {
	 this.timer = setTimeout(() => this.notify("ok"), timeout); 
      } kill { 
	 clearTimeout(this.timer); 
      }
   }
}

const GT = Timer(gameTimeout);

hiphop module prg(resolve) {
   out O;
   signal tmt;
   
   fork {
      run GT() { * };
   } par {
      await (tmt.now);
      emit O(tmt.nowval);
   }
   pragma { resolve(false); }
}

export const mach = new hh.ReactiveMachine(prg);
mach.outbuf = "";
mach.debug_emitted_func = val => val;
mach.batchPromise = new Promise((res, rej) => mach.init(res));
mach.addEventListener("O", evt => mach.outbuf += evt.nowval + "\n");
mach.react();
mach.react();
