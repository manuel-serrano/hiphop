"use hiphop";
"use hopscript";

const hh = require( "hiphop" );

hiphop module setinterval( A ) {
   fork {
      abort( count( 3, now( A ) ) ) {
	 let tmt;
	 async A {
	    tmt = setInterval( this.react, 100 );
	 } kill {
	    clearInterval( tmt );
	 }
      }
   }
};
   
const mach = new hh.ReactiveMachine( setinterval );

mach.debug_emitted_func = console.log;

mach.react();
