"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( O ) {
   loop {
      signal S = 1;
      
      emit S( preval( S ) + 1 );
      emit O( val( S ) );
      yield;
      emit O( preval( O ) );
      yield;
   }
}

exports.prg = new hh.ReactiveMachine( prg, "emitvaluedlocal1" );
