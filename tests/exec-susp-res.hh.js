"use hopscript"

/* check if semantics of suspends / resume is correct when a task is over */

const hh = require( "hiphop" );

var glob = 5;

hiphop module prg( in RESS, in S, O, OT, in T ) {
   fork {
      suspend( now( S ) ) {
	 async T {
	    console.log( "Oi." );
	    setTimeout( function( self ) {
		  console.log( "Oi timeout." );
	       self.notify( glob++ );
	       }, 1000, this );
	 } suspend {
	    console.log( "suspended." );
	 } resume {
	    console.log( "resumed.");
	 }
      }
      emit OT( val( T ) );
   } par {
      emit O();
   }

   await now( RESS );
   emit OT( val( T ) );
}

var machine = new hh.ReactiveMachine( prg, "exec" );
machine.debug_emitted_func = console.log;

machine.react()
machine.inputAndReact( "S" )
machine.inputAndReact( "S" )
machine.inputAndReact( "S" )
machine.inputAndReact( "S" )
machine.react()
machine.react()
machine.inputAndReact( "S" )

setTimeout( function() {
   machine.react()
   machine.inputAndReact( "RESS" )
   machine.inputAndReact( "S" )
   machine.react()
}, 2000 );
