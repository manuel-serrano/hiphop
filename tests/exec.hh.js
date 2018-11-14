"use hopscript"

const hh = require( "hiphop" );

hiphop module prg( in T, O, OT ) {
   fork {
      async T {
	 console.log( "Oi." );
	 setTimeout( function( self ) {
	    console.log( "Oi timeout." );
	    self.notify( 5, false );
	 }, 3000, this );
      }
      emit OT( T.nowval );
   } par {
      emit O();
   }
}

var machine = new hh.ReactiveMachine( prg, "exec" );
machine.debug_emitted_func = console.log

machine.react()
machine.react()
machine.react()
console.log( "......." );
setTimeout( function() {
   machine.react()
   machine.react()
}, 5000 );

