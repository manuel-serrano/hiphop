"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   inout A; inout B;
   loop {
      if( B.now ) emit A();
      yield;
   }
}

export const mach = new hh.ReactiveMachine( prg );
mach.outbuf = "";
mach.debug_emitted_func = val => {
   mach.outbuf += (val.toString() ? "[ '" + val + "' ]\n" : "[]\n");
}

mach.react()
mach.react()
mach.inputAndReact( "B" )
mach.react()
mach.inputAndReact( "B" )
mach.inputAndReact( "B" )

