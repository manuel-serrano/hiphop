const hh = require( "hiphop" );

const m = new hh.ReactiveMachine(
   hiphop module( out S ) {
      loop {
	 signal L = 2;

	 emit S( L.nowval );
	 yield;
      }
   } );

m.addEventListener( "S", function ( evt ) { console.log( evt ); } );
m.react();
m.react();
