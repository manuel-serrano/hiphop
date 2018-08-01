"use hopscript"

const hh = require( "hiphop" );

hiphop module prg( O combine (x, y) => x + y ) {
   loop {
      fork "par" {
	 emit O( 1 );
      }
      yield;
      yield;
   }
}

function add_emit( machine ) {
   machine.getElementById( "par" ).appendChild( hiphop emit O( 1 ) );
}

const machine = new hh.ReactiveMachine( prg, "incr-branch" );
machine.debug_emitted_func = console.log

machine.react()
machine.react()
machine.react()
machine.react()
add_emit( machine );
machine.react()
machine.react()
machine.react()
add_emit( machine );
add_emit( machine );
add_emit( machine );
machine.react()
machine.react()
