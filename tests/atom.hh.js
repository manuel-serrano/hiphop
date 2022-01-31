"use @hop/hiphop";
"use strict"

import * as hh from "@hop/hiphop";

function func() {
   console.log( "atom works!" );
}

hiphop module prg() {
   loop {
      yield;
      hop { func() };
   }
}

exports.prg = new hh.ReactiveMachine( prg, "atom" );
