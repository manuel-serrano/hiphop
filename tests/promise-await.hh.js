"use hiphop";
"use hopscript";

const hh = require( "hiphop" );

const m = new hh.ReactiveMachine(
   hiphop module( I, O ) {
      signal l;
      await immediate I.now;
      fork {
	 async l {
	    const mach = this;
	    setTimeout( () => mach.notify(), 1000 );
	 }
      } par {
	 await immediate l.now;
      }
      emit O( I.nowval );
   } );

async function foo() {
   m.value.I = 45;
   console.log( "I emitted..." );
   let o  = await m.promise.O;
   console.log( "O(" + o + ") emitted..." );
}

foo();
