"use hopscript"

hiphop machine prg( in A = "_", in B ) {
   loop {
      hop {
	 console.log( "A.now=" + A.now, "A.pre=" + A.pre, 
	    "A.nowval=" + A.nowval, "A.preval=" + A.preval );
      	 console.log( "B.now=" + B.now, "B.pre=" + B.pre, 
	    "B.nowval=" + B.nowval, "B.preval=" + B.preval );
      }
      yield;
   }
}

exports.prg = prg;
