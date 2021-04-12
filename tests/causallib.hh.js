"use hiphop";
"use strict";

var hh = require( "hiphop" );


hiphop module mymod( in A, in B, in R, out O ) {
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
        run mymod( ... );
    } par {
        await (O.now);
        emit A();
    }
}

let machine = new hh.ReactiveMachine( prog, {CausalityErrorTrace:"deep", sweep:false} );

try{
machine.react('A','B');
machine.react('A');
machine.react('B');
}catch (e) {
    console.error(e.toString());
}
