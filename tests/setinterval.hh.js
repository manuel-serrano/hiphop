"use hiphop";
"use hopscript";

const hh = require( "hiphop" );

hiphop module setinterval( A, Tick ) {
   fork {
      abort count( 3, Tick.now ) {
	 async A {
	    this.tmt = setInterval( () => this.react( Tick.signame ), 100 );
	 } kill {
	    clearInterval( this.tmt );
	 }
      }
   }
};
   
const mach = new hh.ReactiveMachine( setinterval );

mach.debug_emitted_func = console.log;

mach.react();
