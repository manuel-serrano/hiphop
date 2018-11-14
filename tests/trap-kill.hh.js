"use hiphop";
"use hopscript"


const hh = require( "hiphop" );

const mach = new hh.ReactiveMachine(
   hiphop module() {
      T: fork {
	 async {
	    setTimeout( this.notify.bind( this ), 500 );
	 }
	 break T;
      } par {
	 async {
	    setTimeout( this.notify.bind( this ), 1000 );
	 } kill {
	    console.log( "been killed" );
	 }
      }
   } );

mach.react();
