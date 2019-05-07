"use hiphop"
"use hopscript"

const hh = require( "hiphop" );

hiphop module prg( in X, Y, Z ) {
   await( X.now );

   every count( X.nowval + 5, true ) {
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
