"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( A, B, C ) {
   emit A();
   T: {
      break T;
      emit B();
   }
   emit C();
}

exports.prg = new hh.ReactiveMachine( prg, "trapsimple" );
