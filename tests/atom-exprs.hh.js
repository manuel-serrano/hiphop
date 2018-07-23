"use strict"

var hh = require("hiphop");

var prg = MODULE() {
   LOOP {
      LOCAL( L ) {
	 EMIT L( "foo bar" );
	 PAUSE;
	 ATOM { console.log( "atom works! value of L is", VAL( L ) ) }
      }
   }
}

exports.prg = new hh.ReactiveMachine(prg, "atom");
