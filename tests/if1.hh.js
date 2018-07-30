"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( in I1, O1, in I2, O2 ) {
   loop {
      if( now( I1 ) ) emit O1();
      if( val( I2 ) > 2 ) emit O2();
      yield;
   }
}

exports.prg = new hh.ReactiveMachine( prg, "if1" );
