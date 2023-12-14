"use @hop/hiphop"
"use hopscript"

import * as hh from "@hop/hiphop";

hiphop module mod(n, m) {
   out O;
   emit O(n + m);
}
    
hiphop module prg() {
   out O combine (x, y) => x + y;
   fork {
      run mod(10, 5) { * };
   } par {
      run mod(100, 123) { * };
   }
}

export const mach = new hh.ReactiveMachine( prg );
mach.outbuf = "";
mach.addEventListener("O", evt => mach.outbuf += evt.nowval + "\n");
mach.react();
