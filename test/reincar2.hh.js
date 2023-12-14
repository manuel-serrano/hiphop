"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

function plus( a, b ) {
   return a + b;
}

hiphop module prg() {
   inout S, I, J;
   loop {
      fork {
	 signal M=5;
	 
	 emit J( M.nowval );
	 yield;
	 emit M( 5 );
      } par {
	 signal N;
	 
	 if( N.now ) emit I();
	 yield;
	 emit N();
      } par {
	 signal L;
	 
	 emit L( 4 );
	 yield;
	 emit S( plus( L.nowval, 5 ) );
      }
   }
}

export const mach = new hh.ReactiveMachine( prg, "reincar2" );
