"use hopscript"

const hh = require( "hiphop" );

var glob = 5;

hiphop module prg( in R, O, OT, in T ) {
   for( now( R ) ) {
      fork {
	 abort now( R ) {
	    async T {
	       console.log( "Oi." );
	       setTimeout( function( self ) {
		  console.log( "Oi timeout." );
		  self.notify( glob++ );
		 }, 1000, this);
	    }
	 }
	 emit OT( val( T ));
      } par {
	 emit O();
      }
   }
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

