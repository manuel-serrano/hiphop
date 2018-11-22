"use hopscript"

var hh = require( "hiphop" );

function foo( evt ) {
   console.log( "hi from foo signal", evt.type, "is set!" )
}

function bar( evt ) {
   console.log( "hi from bar signal", evt.type, "is set with value",
	       evt.nowval, "!" )
}

hiphop module prg( in I1, in I2, in I3, in I4, O1, O2, O3, O4 ) {
   loop {
      if( I1.now ) emit O1();
      if( I2.now ) emit O2( I2.nowval );
      if( I3.now ) emit O3( I3.nowval );
      if( I4.now ) emit O4( I4.nowval );
      yield;
   }
}

var m = new hh.ReactiveMachine( prg, "mirror" );
m.addEventListener( "O1", foo );
m.addEventListener( "O2", bar );
m.addEventListener( "O3", bar );
m.addEventListener( "O4", bar );

exports.prg = m
