"use hopscript"

const hh = require( "hiphop" );

hiphop module prg( in V_S_p ) {
   T1: suspend( now( V_S_p ) ) {
      break T1;
   }
}

const machine = new hh.ReactiveMachine( prg, "TEST" );

machine.debug_emitted_func = console.log;
machine.react();
machine.react();
