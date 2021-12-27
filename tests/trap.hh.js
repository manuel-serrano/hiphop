"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg( A, B, C ) {
   emit A();
   T: {
      break T;
      emit B();
   }
   emit C();
}

exports.prg = new hh.ReactiveMachine( prg, "trapsimple" );
