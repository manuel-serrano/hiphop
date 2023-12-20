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
	 pragma { mach.outbuf += ( "weakabort terminated 1." ) + "\n"; }
      } every( A.now )
   } );

mach.outbuf = "";
mach.react();
mach.react();
mach.react();
//mach.outbuf += ( machine.pretty_print() ) + "\n";

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
	 pragma { mach.outbuf += ( "weakabort terminated 2." ) + "\n"; }
      } every( A.now )
   } );

machine2.react();
machine2.react();
machine2.react();
machine2.react();
//mach.outbuf += ( machine2.pretty_print() ) + "\n";

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
	 pragma { mach.outbuf += ( "weakabort terminated 3." ) + "\n"; }
      } every( A.now )
   } );

machine3.react();
machine3.react();
machine3.react();
machine3.react();
