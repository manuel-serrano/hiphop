"use hopscript"

var hh = require( "hiphop" );

function foo( evt ) {
   console.log( "hi from foo signal", evt.signalName, "is set!" )
}

function bar( evt ) {
   console.log( "hi from bar signal", evt.signalName, "is set with value",
	       evt.signalValue, "!" )
}

hiphop module prg( in I1, in I2, in I3, in I4, O1, O2, O3, O4 ) {
   loop {
      if( now( I1 ) ) emit O1();
      if( now( I2 ) ) emit O2( val( I2 ) );
      if( now( I3 ) ) emit O3( val( I3 ) );
      if( now( I4 ) ) emit O4( val( I4 ) );
      yield;
   }
}

var m = new hh.ReactiveMachine( prg, "mirror" );
m.addEventListener( "O1", foo );
m.addEventListener( "O2", bar );
m.addEventListener( "O3", bar );
m.addEventListener( "O4", bar );

exports.prg = m
