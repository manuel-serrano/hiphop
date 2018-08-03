"use hopscript"

const hh = require( "hiphop" );
const mach = new hh.ReactiveMachine(
   hiphop module( S ) {
      while( now( S ) ) {
	 hop { console.log( "every" ) };
	 async {
	    console.log("start", this.id );
	    setTimeout( this.notifyAndReact, 500 );
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
