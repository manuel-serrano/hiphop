"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

const m = new hh.ReactiveMachine(
   hiphop module() {
      inout S, R, E;
      loop {
	 suspend from immediate( S.now ) to immediate( R.now ) emit E() {
	    hop { console.log( "not suspended!" ) }
	 }
	 yield;
      }
   } );

m.debug_emitted_func = emitted => {
   console.log( emitted );
   console.log( "---------------------" );
};
// m.debuggerOn("debug");
// m.stepperOn();
m.react()
m.react()
m.inputAndReact( "S" );
m.react()
m.react()
m.inputAndReact( "R" );
m.react()
m.react()
