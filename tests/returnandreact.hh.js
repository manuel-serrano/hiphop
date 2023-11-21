"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

function foo( cb ) {
   cb( 4 );
}

export const mach = new hh.ReactiveMachine(
   hiphop module() {
      out S;
      async (S) {
         setTimeout( this.notify.bind( this ), 100, 5 );
      }
   } );

mach.debug_emitted_func = console.log
mach.react()

