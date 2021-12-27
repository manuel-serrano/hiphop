"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg( J ) {
   signal I;
   
   fork {
      emit I();
   } par {
      await( I.now );
      emit J();
   }
}

exports.prg = new hh.ReactiveMachine( prg, "parallel" );
