"use hopscript"

const hh = require( "hiphop" );
const fs = require( "fs" );

function make_atom(i) {
   return hiphop do {
      hop { console.log( "branch", i ) };
   } every( G0.now )
}

function make_atom2(i) {
   return hiphop loop {
      await immediate( G0.now );
      hop { console.log( "branch", i ) };
      yield;
   }
}

function make_atom3(i) {
   return hiphop {
      every immediate( G0.now ) {
	 hop { console.log( "branch", i ) }
      }
   }
}

hiphop module prg() {
   signal G0;

   fork "par" {
      loop {
	 emit G0();
	 yield;
      }
   } par {
      ${make_atom( 0 )}
   } par {
      ${make_atom2( 4 )}
   }
}

var machine = new hh.ReactiveMachine( prg, "" );
machine.debug_emitted_func = console.log;

//console.log(machine.ast.pretty_print());

machine.react()
machine.react()

console.log( "add 1" );
machine.getElementById( "par" ).appendChild( make_atom2( 1 ) );
machine.react()
machine.react()


console.log( "add 2" );
machine.getElementById( "par" ).appendChild( make_atom( 2 ) );
//console.error(machine.ast.pretty_print());
machine.react()
//console.error(machine.ast.pretty_print());


machine.react()
machine.react()

console.log("add 3");
machine.getElementById( "par" ).appendChild( make_atom3( 3 ) );
machine.react()
machine.react()
machine.react()

//console.log(machine.ast.pretty_print());
