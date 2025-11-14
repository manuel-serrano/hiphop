"use @hop/hiphop";
"use strict"

import * as hh from "@hop/hiphop";

function func() {
   mach.outbuf += "atom works!\n";
}

hiphop module prg() {
   loop {
      yield;
      pragma { func() };
   }
}

export const mach = new hh.ReactiveMachine( prg, "atom" );
