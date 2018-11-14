"use hiphop"
"use hopscript"

const hh = require( "hiphop" );

const m = new hh.ReactiveMachine(
   hiphop module( G = 6 ) {
      signal S = 5;

      async {
	 console.log( S.nowval, G.nowval );
      }
   } )

m.react();
