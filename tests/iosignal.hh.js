"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg( in I, X, Y ) {
   emit Y();
}

const m = new hh.ReactiveMachine( prg );
m.debug_emitted_func = console.log

m.inputAndReact( "I" );
m.inputAndReact( "X", 15 );
m.react();
m.inputAndReact( "Y" );
