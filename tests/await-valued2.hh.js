"use hopscript"

var hh = require( "hiphop" );

function foo( evt ) {
   console.log( "foo called by", evt.type, "with value", evt.nowval );
}

function foo2( evt ) {
   console.log( "foo2 called by", evt.type, "with value", evt.nowval );
}

function foo3( evt ) {
   console.log( "foo3 called by", evt.type, "with value", evt.nowval );
}


hiphop module prg( in I, out O ) {
   loop {
      await( I.now );
      emit O( I.nowval );
   }
}

var m = new hh.ReactiveMachine( prg, "awaitvalued2" );
m.debug_emitted_func = console.log;

m.addEventListener( "O", foo );

console.log( ";" )
m.react();

m.addEventListener( "O", foo2 );

console.log( "I(34)" )
m.inputAndReact( "I", 34 );

m.addEventListener( "O", foo3 );

console.log( "I(34)" );
m.inputAndReact( "I", 34 );

m.removeEventListener( "O", foo3 );

console.log( "I(15)" );
m.inputAndReact( "I", 15 );
