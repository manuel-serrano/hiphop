"use hopscript"

const hh = require( "hiphop" );

hiphop module prg( S1_and_S2, S1_and_not_S2, not_S1_and_S2, not_S1_and_not_S2 ) {
   signal S1, S2;

   loop {
      T1: fork {
	 emit S1();
	 yield;
	 break T1;
      } par {
	 T2: fork {
	    emit S2();
	    yield;
	    break T2;
	 } par {
	    if( S1.now ) {
	       if( S2.now ) {
		  emit S1_and_S2();
	       } else {
		  emit S1_and_not_S2();
	       }
	    } else {
	       if( S2.now ) {
		  emit not_S1_and_S2();
	       } else {
		  emit not_S1_and_not_S2();
	       }
	       yield;
	    }
	 }
      }
   }
}

exports.prg = new hh.ReactiveMachine( prg, "trappar3" );
