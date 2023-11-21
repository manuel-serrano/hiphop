"use @hop/hiphop"
"use hopscript"

import * as hh from "@hop/hiphop";

hiphop module prg() {
   out O;
   async (O) {
      this.notify( new Promise( function( resolve, reject ) {
	 setTimeout( () => resolve( 5 ), 1000 );
      } ) );
   }
}

export const mach = new hh.ReactiveMachine( prg, "exec" );

mach.addEventListener( "O", function( evt ) {
   mach.outbuf += ( "O=" + evt.nowval.val + " emitted!" ) + "\n";
} );

mach.outbuf = "";
mach.react();
