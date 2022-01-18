"use @hop/hiphop"
"use hopscript"

import * as hh from "@hop/hiphop";

const mach = new hh.ReactiveMachine(
   hiphop module() {
      inout A;
      T: fork {
	 loop {
	    async () {
	       setTimeout( this.notify.bind( this ), 100 );
	    } kill {
	       console.log( "killed" );
	    }

	    host { console.log( 'tick 10s' ) }
	 }
      } par {
	 async () {
	    setTimeout( this.notify.bind( this ), 10 );
	 }
	 break T;
      }

      emit A();
      host { console.log( "end" ) } } );

mach.debug_emitted_func = console.log;

mach.react();
