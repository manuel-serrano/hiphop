"use hopscript"

const hh = require( "hiphop" );

hiphop module prg( A, B ) {
   loop {
      if( B.now ) emit A();
      yield;
   }
}

const m = new hh.ReactiveMachine( prg );
m.debug_emitted_func = console.log;

m.react()
m.react()
m.inputAndReact( "B" )
m.react()
m.inputAndReact( "B" )
m.inputAndReact( "B" )

