"use hiphop"
"use hopscript"

hiphop module prg( in A, in B, in R, out O ) {
   do {
      fork {
	 await( A.now );
      } par {
	 await( B.now );
      }
      emit O();
   } every( R.now )
}

exports.prg = new hh.ReactiveMachine( prg, "ABRO" );
