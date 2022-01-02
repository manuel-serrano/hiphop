"use hopscript";

const hh = require( "hiphop" );

const pauseModule = hiphop module() {
   yield;
}

const m = new hh.ReactiveMachine(
   hiphop module() {
      loop {
	 host { console.log( ">>> start" ) };
	 if( 1 ) {
	    run ${pauseModule}();
	 } else {
	    yield;
	 }
	 host { console.log( ">>> end" ) }
      }
   } )

m.react();
setTimeout( () => m.react(), 200 );
