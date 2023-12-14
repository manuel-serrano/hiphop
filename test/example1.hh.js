"use @hop/hiphop";
"use strict";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   out T;
   
   yield;
   {
      signal S;

      emit S();

      if( S.now ) emit T();
   }
}

export const mach = new hh.ReactiveMachine( prg, "example1" );
