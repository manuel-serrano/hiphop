"use hopscript"

import * as hh from "@hop/hiphop";

hiphop module example( I, O ) {
   loop {
      if( now( O ) ) emit I();
      emit O();
      yield;
   }
}

exports.prg = new hh.ReactiveMachine( example, "presentemit" );
