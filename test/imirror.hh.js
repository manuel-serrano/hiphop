import * as hh from "@hop/hiphop";

hiphop interface Intf { in I; out O };

hiphop module M1() implements Intf {
   if (I.now) emit O();
}

hiphop module M2() implements mirror Intf {
   out OK;
   
   emit I();
   if (O.now) emit OK();
}

hiphop module Main() {
   inout OK;
   signal implements Intf;

   fork {
      run M1() { * };
   } par {
      run M2() { OK, + };
   }
}

export const mach = new hh.ReactiveMachine(Main);
mach.addEventListener("OK", v => mach.outbuf += "got OK\n");

mach.react();
