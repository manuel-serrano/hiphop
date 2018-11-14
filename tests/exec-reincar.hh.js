"use hiphop"
"use hopscript"

const hh = require( "hiphop" );

var glob = 5;

hiphop module prg( in R, O, OT, in T ) {
   do {
      fork {
	 abort( R.now ) {
	    async T {
	       console.log( "Oi." );
	       setTimeout( function( self ) {
		  console.log( "Oi timeout." );
		  self.notify( glob++ , false );
		 }, 1000, this);
	    }
	 }
	 emit OT( T.nowval);
      } par {
	 emit O();
      }
   } every( R.now )
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

