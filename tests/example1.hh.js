"use @hop/hiphop";
"use strict";

import * as hh from "@hop/hiphop";

hiphop module prg( T ) {
   yield;
   {
      signal S;

      emit S();

      if( S.now ) emit T();
   }
}

exports.prg = new hh.ReactiveMachine( prg, "example1" );
