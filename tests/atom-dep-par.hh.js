"use hiphop"
"use hopscript"

const hh = require("hiphop")

hiphop module prg( A combine (x, y) => x + y ) {
   fork {
      loop {
	 emit A( 0 );
	 yield;
      }
   } par {
      loop {
	 emit A( 1 );
	 hop { console.log( A.nowval ) }
	 yield;
      }
   } par {
      loop {
	 emit A( 2 );
	 hop { console.log( A.nowval ) }
	 yield;
      }
   }
}

let machine = new hh.ReactiveMachine( prg, "error2" );

machine.debug_emitted_func = console.log;
machine.react()
machine.react()
machine.react()
machine.react()
machine.react()
