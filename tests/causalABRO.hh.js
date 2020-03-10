"use hiphop";
"use strict";

var hh = require( "hiphop" );


hiphop module ABRO( in A, in B, in R, out O ) {
   do{
      fork {
	 await( A.now );
      } par {
	 await( B.now );
      }
      emit O();
   } every( R.now )
}



hiphop module prog(in I,  in A, in B, in R, out O  ) {
    signal A;
    fork {
        run ABRO( ... );
    } par {
        await (O.now);
        emit A();
    }
}

let machine = new hh.ReactiveMachine( prog, "ABRO" );

try{

machine.react();
machine.react('A','B');
machine.react('A');
machine.react('R');
machine.react('A');
machine.react('B');
machine.react('A','B','R');
}catch (e) {
    console.error(e.toString());
}


