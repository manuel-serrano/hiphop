"use hopscript"

const hh = require("hiphop");

hiphop module prg( B = 5, A = B.nowval ) {
   emit A();
   yield;
   {
      signal Y = B.nowval;
      signal X = Y.nowval;

      fork {
	 emit X();
      }

      emit A( X.nowval );
   }
}

const m = new hh.ReactiveMachine( prg );
m.debug_emitted_func = console.log

m.react()
m.react()
