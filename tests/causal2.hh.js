"use hiphop"
"use hopscript"

let hh = require( "hiphop" );

hiphop module prg() {
   signal V_S_C, V_S_i;

   if( now( V_S_C ) ) {
      ;
   }
   if( now( V_S_i ) ) {
      emit V_S_C();
   }
}

let machine = new hh.ReactiveMachine( prg, "test",{sweep:false,CausalityErrorTrace:"deep"});
try {
  machine.react();
  } catch(e) {
   console.log( "causality error" );
}
