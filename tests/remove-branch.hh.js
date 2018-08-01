"use hopscript"

const hh = require( "hiphop" );

const prg = hiphop module( O combine (x, y) => x + y ) {
   loop {
      fork "par" {
	 emit O( 1 );
      }
      yield;
      yield;
   }
}

function add_emit( machine ) {
   let branch = hiphop emit O( 1 );

   machine.getElementById( "par" ).appendChild( branch );
   return branch;
}

const machine = new hh.ReactiveMachine( prg, "incr-branch" );
machine.debug_emitted_func = console.log

machine.react();
machine.react();
machine.react();
machine.react();
let br1 = add_emit( machine );
machine.react();
machine.react();
machine.react();
add_emit( machine );
add_emit( machine );
add_emit( machine );
machine.react();
machine.react();

machine.getElementById( "par" ).removeChild( br1 );

machine.react();
machine.react();
