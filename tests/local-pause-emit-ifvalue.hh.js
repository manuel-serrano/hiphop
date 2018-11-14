"use hiphop"
"use hopscript"

const hh = require( "hiphop" );

hiphop module prg() {
   loop {
      signal L;

      yield;
      emit L();
      if( !L.nowval ) hop { console.log( "L:", L.nowval ) }
   }
}

const m = new hh.ReactiveMachine( prg )

m.react();
m.react();m.react();m.react();
