import * as hh from "@hop/hiphop";

const MYSIG = "O";

hiphop module mod(n, m) {
   out O;
   emit O(n + m);
}
    
hiphop module prg() {
   out ${MYSIG} combine (x, y) => x + y;
   fork {
      run mod(10, 5) { ${MYSIG} as O };
   } par {
      run mod(100, 123) { * };
   }
}

export const mach = new hh.ReactiveMachine(prg);
mach.outbuf = "";
mach.addEventListener(MYSIG, evt => mach.outbuf += evt.nowval + "\n");
mach.react();
