"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

function foo(evt) {
   m.outbuf += ("hi from foo signal " + evt.signame +  " is set!") + "\n";
}

function bar(evt) {
   m.outbuf += ("hi from bar signal " + evt.signame + " is set with value " + evt.nowval + " !") + "\n"; 
}

hiphop module prg() {
   in I1; in I2; in I3; in I4; inout O1; inout O2; inout O3; inout O4;
   loop {
      if (I1.now) emit O1();
      if (I2.now) emit O2(I2.nowval);
      if (I3.now) emit O3(I3.nowval);
      if (I4.now) emit O4(I4.nowval);
      yield;
   }
}

const m = new hh.ReactiveMachine(prg, "mirror");
m.outbuf = "";
m.addEventListener("O1", foo);
m.addEventListener("O2", bar);
m.addEventListener("O3", bar);
m.addEventListener("O4", bar);

export const mach = m;
