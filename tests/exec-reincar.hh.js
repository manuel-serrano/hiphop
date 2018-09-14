"use hiphop"
"use hopscript"

const hh = require( "hiphop" );

var glob = 5;

hiphop module prg( in R, O, OT, in T ) {
   do {
      fork {
	 abort( now( R ) ) {
	    async T {
	       console.log( "Oi." );
	       setTimeout( function( self ) {
		  console.log( "Oi timeout." );
		  self.notify( glob++ );
		 }, 1000, this);
	    }
	 }
	 emit OT( nowval( T ));
      } par {
	 emit O();
      }
   } every( now( R ) )
}

var machine = new hh.ReactiveMachine( prg, "exec" );
machine.debug_emitted_func = console.log

machine.react()

setTimeout( function() {
   machine.inputAndReact( "R" )
}, 500 );

setTimeout( function() {
   machine.react()
}, 1100 );

setTimeout( function() {
   machine.react()
}, 2000 );

