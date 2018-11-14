"use hiphop"
"use hopscript"

var hh = require( "hiphop" );

function sum( arg1, arg2 ) {
   return arg1 + arg2;
}

hiphop module prg( S1_and_S2, S1_and_not_S2, not_S1_and_S2, not_S1_and_not_S2 ) {
   loop {
      T1: {
	 signal S1 = 10;

	 fork {
	    yield;
	    emit S1( S1.preval );
	    break T1;
	 } par {
	    loop {
	       T2: {
		  signal S2 = 20;
		  
		  fork {
		     yield;
		     emit S2( S2.preval );
		     break T2;
		  } par {
		     loop {
			if( S1.now ) {
			   if( S2.now ) {
			      emit S1_and_S2( sum( S1.nowval, S2.nowval ) );
			   } else {
			      emit S1_and_not_S2( sum( S1.nowval, S2.nowval ) );
			   }
			} else if( S2.now ) {
			   emit not_S1_and_S2( sum( S1.nowval, S2.nowval ) );
			} else {
			   emit not_S1_and_not_S2( sum( S1.nowval, S2.nowval ) );
			}
			yield;
		     }
		  }
	       }
	    }
	 }
      }
   }
}

exports.prg = new hh.ReactiveMachine( prg, "P18valued" );
