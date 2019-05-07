"use hiphop"
"use hopscript"

/* check if semantics of suspends / resume is correct when a task is over */

const hh = require( "hiphop" );

var glob = 5;

hiphop module prg( in RESS, in S, O, OT, in T ) {
   fork {
      suspend( S.now ) {
	 async T {
	    console.log( "Oi." );
	    setTimeout( function( self ) {
		  console.log( "Oi timeout." );
	       	  self.notify( glob++, false );
	       }, 1000, this );
	 } suspend {
	    console.log( "suspended." );
	 } resume {
	    console.log( "resumed.");
	 }
      }
      emit OT( T.nowval );
   } par {
      emit O();
   }

   await( RESS.now );
   emit OT( T.nowval );
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
