"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

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

hiphop module prg() {
   out O;
   signal tmt;
   
   fork {
      run GT() { * };
   } par {
      await (tmt.now);
      emit O(tmt.nowval);
   }
}

export const mach = new hh.ReactiveMachine(prg);
mach.outbuf = "";
mach.debug_emitted_func = val => {
   mach.outbuf += (val.toString() ? "[ '" + val + "' ]\n" : "[]\n");
}
mach.outbuf = "";
mach.addEventListener("O", evt => mach.outbuf += evt.nowval + "\n");
mach.react();
mach.react();
