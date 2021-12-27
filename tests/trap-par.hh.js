"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg( A, B, C ) {
   T: fork {
      emit A();
      break T;
   } par {
      emit B();
      yield;
      emit C();
   }
}

exports.prg = new hh.ReactiveMachine( prg, "trappar" );
