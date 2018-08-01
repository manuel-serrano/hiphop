"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( O, S ) {
   loop {
      abort( pre( S ) ) {
	 emit S();
	 yield;
	 emit O();
      }
      yield;
   }
}

//console.error(prg.pretty_print())

exports.prg = new hh.ReactiveMachine(prg, "abortpre");
