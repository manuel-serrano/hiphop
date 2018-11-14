"use hopscript"

const hh = require( "hiphop" );

hiphop module prg( in V_S_p ) {
   T1: suspend( V_S_p.now ) {
      break T1;
   }
}

const machine = new hh.ReactiveMachine( prg, "TEST" );

machine.debug_emitted_func = console.log;
machine.react();
machine.react();
