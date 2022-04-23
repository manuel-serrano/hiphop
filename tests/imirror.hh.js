"use @hop/hiphop";

import * as hh from "@hop/hiphop";

hiphop interface Intf { in I; out O };

hiphop module M1() implements Intf {
   if (I.now) emit O();
}

hiphop module M2 implements mirror Intf { out OK } {
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

const m = new hh.ReactiveMachine(Main);
m.addEventListener("OK", v => console.log("got OK"));

m.react();
