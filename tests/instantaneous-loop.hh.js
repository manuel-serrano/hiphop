"use @hop/hiphop"
"use strict"

import * as hh from "@hop/hiphop";

export let mach = undefined;
try {
   const prg = hiphop module() {
      out O;
      
      loop {
	 signal L;

	 emit L( "foo bar" );
	 emit O( L.nowval );
      }
   }

   mach = new hh.ReactiveMachine( prg, "instloop" );

   mach.react();
   mach.react();
   mach.react();
   mach.react();
} catch ( e ) {
   console.log( e.message );
}

