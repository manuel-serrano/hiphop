"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   in I; out O;
   loop {
      await immediate( I.now );
      emit O();
      yield;
   }
}

exports.prg = new hh.ReactiveMachine( prg, "awaitimmediate" );
