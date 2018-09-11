"use hiphop"
"use hopscript"

const hh = require( "hiphop" );

const mach = new hh.ReactiveMachine(
   hiphop module( A ) {
      T: fork {
	 loop {
	    signal FOO;

	    async {
	       setTimeout( this.notifyAndReact, 100 );
	    } kill {
	       console.log( "killed" );
	    }

	    hop { console.log( 'tick 10s' ) }
	 }
      } par {
	 async {
	    setTimeout( this.notifyAndReact, 10 );
	 }
	 break T;
      }

      emit A();
      hop { console.log( "end" ) } } );

mach.debug_emitted_func = console.log;

mach.react();
