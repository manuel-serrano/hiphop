"use hopscript"

const hh = require( "hiphop" );

hiphop module prg() {
   loop {
      let L;

      yield;
      emit L();
      if( !val( L ) ) hop { console.log( "L:", val( L ) ) }
   }
}

const m = new hh.ReactiveMachine( prg )

m.react();
m.react();m.react();m.react();
