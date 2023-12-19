import * as hh from "@hop/hiphop";

hiphop module mod(n) {
   out O;
   emit O(n);
}
    
hiphop module prg() {
   out O combine (x, y) => x + y;
   fork {
      run mod(10) { * };
   } par {
      run mod(100) { * };
   }
}

export const mach = new hh.ReactiveMachine(prg);
mach.outbuf = "";
mach.addEventListener("O", evt => mach.outbuf += (evt.nowval) + "\n");
mach.react();
