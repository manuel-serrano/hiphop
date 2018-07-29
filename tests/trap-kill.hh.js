"use hopscript"

const hh = require( "hiphop" );

const mach = new hh.ReactiveMachine(
   hiphop module() {
      T: fork {
	 async {
	    setTimeout( this.notifyAndReact, 500 );
	 }
	 break T;
      } par {
	 async {
	    setTimeout( this.notifyAndReact, 1000 );
	 } kill {
	    console.log( "been killed" );
	 }
      }
   } );

mach.react();
