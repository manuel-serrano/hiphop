"use @hop/hiphop";
"use strict";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   loop {
      signal L;

      emit L( "foo bar" );
      yield;
      host { console.log( "atom works! value of L is", L.nowval ) }
   }
}

exports.prg = new hh.ReactiveMachine(prg, "atom");
