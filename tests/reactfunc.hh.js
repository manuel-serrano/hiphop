"use hiphop"
"use hopscript"

const hh = require( "hiphop" );

function foo( evt ) {
   console.log( "hi from foo signal", evt.type, "is set!" )
}

function bar( evt ) {
   console.log( "hi from bar signal", evt.type, "is set!" )
}

function foo2( evt ) {
   console.log( "hi from foo2 signal", evt.type, "is set with", evt.nowval, "!" )
}

function bar2( evt ) {
   console.log( "hi from bar2 signal", evt.type, "is set with", evt.nowval, "!" )
}

hiphop module prg( in I1, in I2, O1, O11, O2 ) {
   loop {
      if( I1.now ) {
	 emit O1();
	 emit O11();
      }
      if( I2.now ) {
	 emit O2( I2.nowval );
      }
      yield;
   }
}

const m = new hh.ReactiveMachine( prg, "reactfunc" );

m.addEventListener( "O1", foo );
m.addEventListener( "O11", foo );
m.addEventListener( "O11", bar );
m.addEventListener( "O2", foo2 )
m.addEventListener( "O2", bar2 );

exports.prg = m;
