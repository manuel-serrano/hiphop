"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( in I1, O1, in I2, O2 ) {
   loop {
      if( I1.now ) emit O1();
      if( I2.nowval > 2 ) emit O2();
      yield;
   }
}

exports.prg = new hh.ReactiveMachine( prg, "if1" );
