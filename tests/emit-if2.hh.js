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

export const mach = new hh.ReactiveMachine( prg );
mach.outbuf = "";
mach.debug_emitted_func = val => {
   mach.outbuf += (val.toString() ? "[ '" + val + "' ]\n" : "[]\n");
}

mach.react()
mach.react()
mach.inputAndReact( "C" )
mach.react()
mach.inputAndReact( "C" )
mach.inputAndReact( "C" )

