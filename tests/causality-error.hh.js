"use hopscript"

var hh = require( "hiphop" );

hiphop module example( I, O ) {
   loop {
      if( now( O ) ) emit I();
      emit O();
      yield;
   }
}

exports.prg = new hh.ReactiveMachine( example, "presentemit" );
