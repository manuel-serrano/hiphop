"use hopscript"

const hh = require( "hiphop" );

const machine = new hh.ReactiveMachine(
   hiphop module( A, B ) {
      do {
	 weakabort( now( B ) ) {
	    fork {
	       yield;
	       emit B();
	    }
	 }
	 hop { console.log( "weakabort terminated 1." ); }
      } every( now( A ) )
   } );

machine.react();
machine.react();
machine.react();
//console.log( machine.pretty_print() );

const machine2 = new hh.ReactiveMachine(
   hiphop module( A, B ) {
      do {
	 weakabort( now( B ) ) {
	    fork {
	       yield;
	       emit B();
	    }
	 }
	 hop { console.log( "weakabort terminated 2." ); }
      } every( now( A ) )
   } );

machine2.react();
machine2.react();
machine2.react();
machine2.react();
//console.log( machine2.pretty_print() );

const machine3 = new hh.ReactiveMachine(
   hiphop module( A, B ) {
      do {
	 T: fork {
	    await now( B );
	    break T;
	 } par {
	    yield;
	    emit B();
	 }
	 hop { console.log( "weakabort terminated 3." ); }
      } every( now( A ) )
   } );

machine3.react();
machine3.react();
machine3.react();
machine3.react();
