"use hopstrict"

var hh = require( "hiphop" );

hiphop module prg( O ) {
   loop {
      signal S;
      
      if( now( S ) ) emit O();
      yield;
      emit S();
   }
}

exports.prg = new hh.ReactiveMachine( prg, "reincar" );
