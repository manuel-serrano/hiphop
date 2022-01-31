"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   in I; out O;
   every count( 2, I.now ) {
      emit O();
   }
}

exports.prg = new hh.ReactiveMachine( prg, "everydelay" );
