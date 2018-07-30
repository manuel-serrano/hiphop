"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( A, B, C, D ) {
   emit A();
   U: {
      T: {
	 break U;
	 emit B();
      }
      emit C();
   }
   emit D();
}

exports.prg = new hh.ReactiveMachine( prg, "trapnested2" );
