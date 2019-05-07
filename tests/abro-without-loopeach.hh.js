"use hopscript"

var hh = require("hiphop");

hiphop module prg( in A, in B, in R, out O ) {
   loop {
      abort( R.now ) {
	 fork {
	    await( A.now );
	 } par {
	    await( B.now );
	 }
	 emit O();
	 halt;
      }
   }
};

exports.prg = new hh.ReactiveMachine( prg, "ABRO" );


