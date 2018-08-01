"use hopscript"

const hh = require( "hiphop" );
const tl = hh.timelib;

const m = new hh.ReactiveMachine(
   hiphop module( I, O ) {
      await immediate now( I );
      ${ <tl.timeout value=1000/> }
      emit O( val( I ) );
   } );

async function foo() {
   m.value.I = 45;
   console.log( "I emitted..." );
   let o  = await m.promise.O;
   console.log( "O(" + o + ") emitted..." );
}

foo();
