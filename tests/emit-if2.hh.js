"use hopscript"

const hh = require( "hiphop" );

hiphop module prg( A, B, C ) {
   fork {
      loop {
	 if( val( B ) > 3 ) emit A();
	 yield;
      }
   } par {
      loop {
	 if( now( C ) ) {
	    emit B( 4 );
	 } else {
	    emit B( 3 );
	 }
	 yield;
      }
   }
}

const m = new hh.ReactiveMachine( prg );
m.debug_emitted_func = console.log

m.react()
m.react()
m.inputAndReact( "C" )
m.react()
m.inputAndReact( "C" )
m.inputAndReact( "C" )

