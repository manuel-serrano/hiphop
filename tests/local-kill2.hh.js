"use hiphop";
"use hopscript";

const hh = require( "hiphop" );

const mach = new hh.ReactiveMachine(
   hiphop module( A ) {
      T: fork {
	 loop {
	    let tmt;

	    async {
	       tmt = setTimeout( this.notifyAndReact, 100 );
	    } kill {
	       console.log( "killed" );
	       clearTimeout( tmt );
	    }

	    hop { console.log( 'tick 10s' ) }
	 }
      } par {
	 break T;
      }

      emit A();
   } );

mach.debug_emitted_func = console.log;

mach.react();
