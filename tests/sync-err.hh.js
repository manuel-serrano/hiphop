"use @hop/hiphop";
"use strict";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   out O;
   signal L;

   fork {
      loop {
	 emit L();
	 yield;
      }
   } par {
      loop {
	 await immediate( L.now );
	 emit O();
      }
   }
}

export const mach = new hh.ReactiveMachine( prg, "sync-err" );

try {
   console.log( mach.react() );
   console.log( mach.react() );
   console.log( mach.react() );
   console.log( mach.react() );
} catch( e ) {
   console.log( e.message );
}
