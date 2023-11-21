"use @hop/hiphop"
"use hopscript"

import * as hh from "@hop/hiphop";

function minus( arg1, arg2 ) { return arg1 - arg2 };
function plus( arg1, arg2 ) { return arg1 + arg2 };

hiphop module prg() {
   inout I; out O=5; inout U;
   loop {
      emit I( plus( 3 - 2, 5 ) );
      emit O( plus( I.nowval,  7 ) );
      emit U( minus( O.preval, 1 ) );
      yield;
   }
}

export const mach = new hh.ReactiveMachine( prg, "value2" );
