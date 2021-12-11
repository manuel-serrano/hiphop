"use strict"

const hh = require("hiphop");

hiphop module prg() {
   loop {
      signal L;

      emit L( "foo bar" );
      yield;
      host { console.log( "atom works! value of L is", L.nowval ) }
   }
}

exports.prg = new hh.ReactiveMachine(prg, "atom");
