"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   t: {
      t2: {
	 break t2;
      }
      hop { console.log( "first level" ) };
   }
   hop { console.log( "top level" ) };
}

const m = new hh.ReactiveMachine( prg );

m.react();
