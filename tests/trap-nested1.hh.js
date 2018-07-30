"use hopscript"

const hh = require( "hiphop" );

hiphop module prg( A, B, C, D ) {
   emit A();
   U: {
      T: {
	 break T;
	 emit B();
      }
      break U;
      emit C();
   }
   emit D();
}

exports.prg = new hh.ReactiveMachine( prg, "trapnested1" );
