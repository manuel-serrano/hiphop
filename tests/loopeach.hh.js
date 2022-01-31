"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   in I; out O;
   do {
      emit O();
   } every( I.now )
}

exports.prg = new hh.ReactiveMachine( prg, "loopeach" );
