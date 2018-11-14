"use hopscript"

const hh = require( "hiphop" );

hiphop module prg( O, OT ) {
   fork {
      async {
	 console.log( "Oi." );
	 setTimeout( () => {
	    console.log( "Oi timeout." );
	    this.notify( 5, false );
	 }, 3000 );
      }
      emit OT();
   } par {
      emit O();
   }
}

var machine = new hh.ReactiveMachine( prg, "exec" );
machine.debug_emitted_func = console.log;

machine.react();
machine.react();
machine.react();
console.log( "......." );
setTimeout( function() {
   machine.react()
   machine.react()
}, 5000 );

