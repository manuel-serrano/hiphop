"use hiphop";
"use hopscript";

const hh = require( "hiphop" );

hiphop module setinterval( A, Tick ) {
   fork {
      abort( count( 3, Tick.now ) ) {
	 async A {
	    function tick() { this.machine.react( Tick.signame ) };
	    
	    this.tmt = setInterval( tick, 100 );
	 } kill {
	    clearInterval( this.tmt );
	 }
      }
   }
};
   
const mach = new hh.ReactiveMachine( setinterval );

mach.debug_emitted_func = console.log;

mach.react();
