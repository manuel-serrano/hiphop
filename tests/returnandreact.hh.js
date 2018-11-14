"use hopscript"

const hh = require( "hiphop" );

function foo( cb ) {
   cb( 4 );
}

const m = new hh.ReactiveMachine(
   hiphop module( S ) {
      async S {
         setTimeout( this.notify.bind( this ), 100, 5 );
      }
   } );

m.debug_emitted_func = console.log
m.react()

