"use hopscript"

const hh = require("hiphop")

const prg = MODULE( INOUT A COMBINE (x, y) => x + y ) {
   FORK {
      LOOP {
	 EMIT A( 0 );
	 PAUSE;
      }
   } PAR {
      LOOP {
	 EMIT A( 1 );
	 ATOM { console.log( VAL( A ) ) }
	 PAUSE;
      }
   } PAR {
      LOOP {
	 EMIT A( 2 );
	 ATOM { console.log( VAL( A ) ) }
	 PAUSE;
      }
   }
}

let machine = new hh.ReactiveMachine(prg, "error2");

machine.debug_emitted_func = console.log;
machine.react()
machine.react()
machine.react()
machine.react()
machine.react()
