"use hopscript"

var hh = require("hiphop");

hiphop module prg( in A, in B, in R, out O ) {
   loop {
      abort( now( R ) ) {
	 fork {
	    await now( A );
	 } par {
	    await now( B );
	 }
	 emit O();
	 halt;
      }
   }
};

exports.prg = new hh.ReactiveMachine( prg, "ABRO" );


