"use hiphop"
"use strict"

var hh = require("hiphop");

try {
   const prg = hiphop module( O ) {
      loop {
	 signal L;

	 emit L( "foo bar" );
	 emit O( L.nowval );
      }
   }

   let m = new hh.ReactiveMachine( prg, "instloop" );

   m.react();
   m.react();
   m.react();
   m.react();
} catch ( e ) {
   console.log( e.message );
}

