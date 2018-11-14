"use hiphop";
"use hopscript";

var hh = require( "hiphop" );

hiphop module prg( O, S ) {
   loop {
      abort( S.pre ) {
	 emit S();
	 yield;
	 emit O();
      }
      yield;
   }
}

//console.error(prg.pretty_print())

exports.prg = new hh.ReactiveMachine(prg, "abortpre");
