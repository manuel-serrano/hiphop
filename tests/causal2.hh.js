"use hiphop"
"use hopscript"

const hh = require( "hiphop" );

hiphop module prg() {
   signal V_S_C, V_S_i;

   if( V_S_C.now ) {
      ;
   }
   if( V_S_i.now ) {
      emit V_S_C();
   }
}

let machine = new hh.ReactiveMachine( prg );

try {
    machine.react();
} catch( e ) {
    console.log( "causality error" );
}
