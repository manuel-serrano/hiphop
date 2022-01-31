"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   fork {
      yield;
   } par {
   }
}

exports.prg = new hh.ReactiveMachine( prg, "nothingpar" );
