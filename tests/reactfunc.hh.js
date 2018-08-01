"use hopscript"

var hh = require( "hiphop" );

function foo( evt ) {
   console.log( "hi from foo signal", evt.signalName, "is set!" )
}

function bar( evt ) {
   console.log( "hi from bar signal", evt.signalName, "is set!" )
}

function foo2( evt ) {
   console.log( "hi from foo2 signal", evt.signalName, "is set with", evt.signalValue, "!" )
}

function bar2( evt ) {
   console.log( "hi from bar2 signal", evt.signalName, "is set with", evt.signalValue, "!" )
}

hiphop module prg( in I1, in I2, O1, O11, O2 ) {
   loop {
      if( now( I1 ) ) {
	 emit O1();
	 emit O11();
      }
      if( now( I2 ) ) {
	 emit O2( val( I2 ) );
      }
      yield;
   }
}

var m = new hh.ReactiveMachine( prg, "reactfunc" );

m.addEventListener( "O1", foo );
m.addEventListener( "O11", foo );
m.addEventListener( "O11", bar );
m.addEventListener( "O2", foo2 )
m.addEventListener( "O2", bar2 );

exports.prg = m;
