"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg( in I, J, O ) {
   suspend( I.now ) {
      loop {
	 emit O();
	 yield;
      }
   }
   emit J();
}   

exports.prg = new hh.ReactiveMachine( prg, "SUSPEND" );
