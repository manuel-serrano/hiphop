"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   out O;
   loop {
      emit O( 5 );
      emit O( 5 );
      yield;
   }
}

export const mach = new hh.ReactiveMachine( prg, "emiterror" );

try {
   mach.react();
} catch( e ) {
   console.log( e.message );
}
