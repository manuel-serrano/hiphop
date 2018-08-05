"use hopscript"

const hh = require( "hiphop" );

const mach = new hh.ReactiveMachine(
   hiphop module( toogle ) {
      suspend( toggle now( toogle ) ) {
	 loop {
	    hop { console.log( "plop" ); }
	    yield;
	 }
      }
   } );

mach.debug_emitted_func = console.log;

mach.react();
mach.react();
mach.inputAndReact( 'toogle' );
mach.react();
mach.react();
mach.inputAndReact( 'toogle' );
mach.react();
mach.react();
