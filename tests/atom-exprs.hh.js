"use strict"

var hh = require("hiphop");

hiphop module prg() {
   loop {
      let L;

      emit L( "foo bar" );
      yield;
      hop { console.log( "atom works! value of L is", val( L ) ) }
   }
}

exports.prg = new hh.ReactiveMachine(prg, "atom");
