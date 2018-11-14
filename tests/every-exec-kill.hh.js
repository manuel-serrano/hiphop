"use hiphop";
"use hopscript";

const hh = require( "hiphop" );
const mach = new hh.ReactiveMachine(
   hiphop module( S ) {
      every( S.now ) {
	 hop { console.log( "every" ) };
	 async {
	    console.log("start", this.id );
	    setTimeout( this.notify.bind( this ), 500 );
	 } kill {
	    console.log( "killed", this.id );
	 }
      }
   } );

mach.react();
console.log( '----' );
mach.inputAndReact( "S" );
console.log( '----' );
setTimeout( () => mach.inputAndReact( "S" ), 200 );
