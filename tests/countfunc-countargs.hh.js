"use hopscript"

const hh = require( "hiphop" );

hiphop module prg( in X, Y, Z ) {
   await now( X );

   every( count( val( X ) + 5, true ) ) {
      emit Y();
   }
   emit Z();
}

var m = new hh.ReactiveMachine( prg );
m.debug_emitted_func = console.log

m.react()
m.inputAndReact( "X", 1 )
m.react()
m.react()
m.react()
m.react()
m.react()
m.react()
m.react()
m.react()
