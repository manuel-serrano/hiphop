"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   inout A, B, C;
   
   fork {
      loop {
	 if( B.nowval > 3 ) emit A();
	 yield;
      }
   } par {
      loop {
	 if( C.now ) {
	    emit B( 4 );
	 } else {
	    emit B( 3 );
	 }
	 yield;
      }
   }
}

const m = new hh.ReactiveMachine( prg );
m.debug_emitted_func = console.log

m.react()
m.react()
m.inputAndReact( "C" )
m.react()
m.inputAndReact( "C" )
m.inputAndReact( "C" )

