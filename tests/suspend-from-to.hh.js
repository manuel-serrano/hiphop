"use hopscript"

const hh = require( "hiphop" );

hiphop module prg( I, O ) {
   yield;
   suspend( from now( I ) to now( O ) ) {
      loop {
	 hop { console.log( "ploup!" ) }
	 yield;
      }
   }
}

const m = new hh.ReactiveMachine( prg );
m.debug_emitted_func = console.log;

m.react();
m.react();
console.log( "--" );
m.inputAndReact( "I" );
m.react();
m.react();
m.react();
console.log( "--" );
m.inputAndReact( "O" );
m.react();
m.react();
m.react();
console.log( "--" );
m.inputAndReact( "I" );
m.react();
