"use hiphop";
"use hopscript";

const hh = require( "hiphop" );

hiphop module setinterval( A ) {
   fork {
      abort( count( 3, A.now ) ) {
	 async A {
	    this.tmt = setInterval( this.react.bind( this ), 100 );
	 } kill {
	    clearInterval( this.tmt );
	 }
      }
   }
};
   
const mach = new hh.ReactiveMachine( setinterval );

mach.debug_emitted_func = console.log;

mach.react();
