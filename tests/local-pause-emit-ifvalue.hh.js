"use hiphop"
"use hopscript"

const hh = require( "hiphop" );

hiphop module prg() {
   loop {
      signal L;

      yield;
      emit L();
      if( !nowval( L ) ) hop { console.log( "L:", nowval( L ) ) }
   }
}

const m = new hh.ReactiveMachine( prg )

m.react();
m.react();m.react();m.react();
