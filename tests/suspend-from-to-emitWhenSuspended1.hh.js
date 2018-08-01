"use hopscript"

const hh = require( "hiphop" );

const m = new hh.ReactiveMachine(
   hiphop module( S, R, E ) {
      suspend from now( S ) to now( R ) emitwhensuspended E {
	 loop {
	    hop { console.log( "not suspended!" ) }
	    yield;
	 }
      }
   } );

m.debug_emitted_func = emitted => {
   console.log( emitted );
   console.log( "---------------------" );
};

m.react()
m.react()
m.inputAndReact( "S" );
m.react()
m.react()
m.inputAndReact( "R" );
m.react()
m.react()
