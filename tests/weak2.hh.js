"use hopscript"

var hh = require( "hiphop" );

hiphop module m( in S, O, F, W, Z ) {
   weakabort now( S ) {
      loop {
	 emit O;
	 yield;
	 emit W;
	 yield;
	 emit Z;
      }
   }
   emit F;
}
   
exports.prg = new hh.ReactiveMachine( m, "wabort2" );
