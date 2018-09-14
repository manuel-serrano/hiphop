"use hopscript"

const hh = require("hiphop");

hiphop module prg( B = 5, A = nowval( B ) ) {
   emit A();
   yield;
   {
      signal Y = nowval( B );
      signal X = nowval( Y );

      fork {
	 emit X();
      }

      emit A( nowval( X ) );
   }
}

const m = new hh.ReactiveMachine( prg );
m.debug_emitted_func = console.log

m.react()
m.react()
