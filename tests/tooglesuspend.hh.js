"use hiphop";
"use hopscript";

const hh = require( "hiphop" );

hiphop machine mach( toogle ) {
   suspend toggle( toogle.now ) {
      loop {
	 hop { console.log( "plop" ); }
	 yield;
      }
   }
}

mach.debug_emitted_func = console.log;

mach.react();
mach.react();
mach.inputAndReact( 'toogle' );
mach.react();
mach.react();
mach.inputAndReact( 'toogle' );
mach.react();
mach.react();
