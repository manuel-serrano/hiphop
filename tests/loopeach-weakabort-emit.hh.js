"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

export const mach = new hh.ReactiveMachine(
   hiphop module() {
      inout A; inout B;
      do {
	 weakabort( B.now ) {
	    fork {
	       yield;
	       emit B();
	    }
	 }
	 host { console.log( "weakabort terminated 1." ); }
      } every( A.now )
   } );

mach.react();
mach.react();
mach.react();
//console.log( machine.pretty_print() );

const machine2 = new hh.ReactiveMachine(
   hiphop module() {
      inout A; inout B;
      do {
	 weakabort( B.now ) {
	    fork {
	       yield;
	       emit B();
	    }
	 }
	 host { console.log( "weakabort terminated 2." ); }
      } every( A.now )
   } );

machine2.react();
machine2.react();
machine2.react();
machine2.react();
//console.log( machine2.pretty_print() );

const machine3 = new hh.ReactiveMachine(
   hiphop module() {
      inout A; inout B;
      do {
	 T: fork {
	    await( B.now );
	    break T;
	 } par {
	    yield;
	    emit B();
	 }
	 host { console.log( "weakabort terminated 3." ); }
      } every( A.now )
   } );

machine3.react();
machine3.react();
machine3.react();
machine3.react();
