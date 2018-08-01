"use hopscript"

function plus( x, y ) { return x+y };

var hh = require( "hiphop" );

hiphop module prg( in I, in R, O = 0 ) {
   loop {
      abort( now( R ) ) {
	 await now( I );
	 emit O( plus( preval( O ), 1 ) );
	 yield;
      }
   }
}

exports.prg = new hh.ReactiveMachine( prg, "Incr" );
