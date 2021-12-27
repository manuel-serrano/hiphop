"use @hop/hiphop";
"use hopscript";

import {ReactiveMachine} from "@hop/hiphop";

hiphop module M1( a ) {
   emit a( 100 );
   async (a) {
      this.notify( 10 );
   }
}

hiphop module main( a, b ) {
   run M1( a as b );
   yield;
   run M1( a );
}

const m = new ReactiveMachine(main, "exec-module");

m.addEventListener( "a", e => console.log( "a=", e.nowval ) );
m.addEventListener( "b", e => console.log( "b=", e.nowval ) );

m.react();
m.react();
m.react();
m.react();
m.react();
m.react();
m.react();
m.react();
