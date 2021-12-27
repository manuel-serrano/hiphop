"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg( O ) {
   loop {
      emit O( 5 );
      emit O( 5 );
      yield;
   }
}

const machine = new hh.ReactiveMachine( prg, "emiterror" );

try {
   machine.react();
} catch( e ) {
   console.log( e.message );
}
