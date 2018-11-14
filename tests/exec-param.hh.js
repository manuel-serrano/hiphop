"use hiphop"
"use hopscript"

const hh = require( "hiphop" );

hiphop module prg( in IN combine (x, y) => x + y ) {
   emit IN( ${5} );
   async {
      console.log( "receive " + IN.nowval );
      this.notify( undefined, false );
   }
}

const machine = new hh.ReactiveMachine( prg, "" );
machine.debug_emitted_func = console.log

machine.inputAndReact( "IN", 5 );
machine.inputAndReact( "IN", 5 );
machine.inputAndReact( "IN", 5 );
