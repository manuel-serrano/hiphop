"use hopscript"

const hh = require( "hiphop" );

const m = new hh.ReactiveMachine(
   hiphop module( G = 6 ) {
      let S = 5;
      
      async {
	 console.log( val( S ), val( G ) );
      }
   } )

m.react();
