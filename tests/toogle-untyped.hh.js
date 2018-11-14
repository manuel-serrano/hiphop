"use hiphop";
"use hopscript";

var hh = require( "hiphop" );

function bool_and( x, y ) {
   return x && y
}

function bool_or( x, y ) {
   return x || y
}

function plus( x, y ) {
   return x + y
}

hiphop module prg( SEQ=1 combine plus,
		   STATE1=false combine bool_or,
		   STATE2=false combine bool_and,
		   S, TOOGLE ) {
   loop {
      emit SEQ( SEQ.preval + 1 );
      emit STATE1( ${true} );
      emit STATE1( ${false} );
      emit STATE2( ${true} );
      emit STATE2( ${false} );
      if( S.pre ) {
	 emit TOOGLE( ${true} );
      } else {
	 emit TOOGLE( ${false} );
	 emit S();
      }
      yield;
   }
}

exports.prg = new hh.ReactiveMachine( prg, "toogle" );
