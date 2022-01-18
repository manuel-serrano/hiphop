"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   out O;
   loop {
      signal L;

      fork {
	 emit L();
      } par {
	 fork {
	    if( L.now ) emit O();
	 }
      }

      yield;
   }
}

exports.prg = new hh.ReactiveMachine( prg, "parallelunary" );
