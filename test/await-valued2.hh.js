"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";
import { format } from "util";

function foo( evt ) {
   mach.outbuf += ("foo called by " + evt.signame + " with value " + evt.nowval) + "\n";
}

function foo2( evt ) {
   mach.outbuf += ("foo2 called by " + evt.signame + " with value " + evt.nowval) + "\n";
}

function foo3( evt ) {
   mach.outbuf += ("foo3 called by " + evt.signame + " with value " + evt.nowval) + "\n";
}

hiphop module prg() {
   in I; out O;
   loop {
      await(I.now);
      emit O(I.nowval);
   }
}

export const mach = new hh.ReactiveMachine( prg, "awaitvalued2" );
mach.outbuf = "";
mach.debug_emitted_func = val => {
   mach.outbuf += format(val) + "\n";
}

mach.addEventListener("O", foo);

mach.outbuf += (";") + "\n"
mach.react();

mach.addEventListener("O", foo2);

mach.outbuf += ("I(34)") + "\n"
mach.react({I: 34});

mach.addEventListener("O", foo3);

mach.outbuf += ("I(34)") + "\n";
mach.react({I: 34});

mach.removeEventListener("O", foo3);

mach.outbuf += ("I(15)") + "\n";
mach.react({I: 15});
