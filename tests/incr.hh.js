"use hiphop"
"use hopscript"

function plus( x, y ) { return x+y };

const hh = require( "hiphop" );

hiphop module prg( in I, in R, O = 0 ) {
   loop {
      abort( R.now ) {
	 await( I.now );
	 emit O( plus( O.preval, 1 ) );
	 yield;
      }
   }
}

exports.prg = new hh.ReactiveMachine( prg, "Incr" );
