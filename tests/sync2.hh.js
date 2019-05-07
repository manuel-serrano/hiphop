"use hiphop";
"use strict";
"use hopscript";

const hh = require( "hiphop" );

hiphop module prg( O ) {
   signal L;

   fork {
      loop {
	 emit L();
	 yield;
      }
   } par {
      loop {
	 await immediate( L.now );
	 emit O();
	 yield;
      }
   }
}

const machine = new hh.ReactiveMachine( prg, "sync2" );
machine.debug_emitted_func = console.log;

machine.react()
machine.react()
machine.react()
machine.react()
