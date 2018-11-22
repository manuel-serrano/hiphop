"use hiphop";
"use hopscript";

const hh = require( "hiphop" );

const mach = new hh.ReactiveMachine(
   hiphop module( A ) {
      T: fork {
	 loop {
	    let tmt;

	    async {
	       tmt = setTimeout( this.notify.bind( this ), 1000 );
	    } kill {
	       console.log( "killed" );
	       clearTimeout( tmt );
	    }

	    hop { console.log( 'tick 10s' ) }
	 }
      } par {
	 async {
	    setTimeout( this.notify.bind( this ), 50 );
	 }
	 break T;
      }

      emit A();
   } );

mach.debug_emitted_func = console.log;

mach.react();
