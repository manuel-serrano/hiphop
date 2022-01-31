"use @hop/hiphop";
"use hopscript"

import * as hh from "@hop/hiphop";

hiphop module prg() {
   inout B;
   signal V_S_C, V_S_i;

   if(  V_S_C.now  ) { 
      ;
   }
   if( B.now  ) { 
      emit V_S_C();
   }
}

const machine = new hh.ReactiveMachine( prg );
try {
    machine.react();
} catch( e ) { 
    console.log( "causality error" );
}
