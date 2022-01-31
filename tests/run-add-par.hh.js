"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module m1() {
   inout S, U, W, Z;
   fork {
      if( S.now ) emit W();
   } par {
      if( U.now ) emit Z();
   }
}

hiphop module run2() {
   inout S, U, A, B;
   fork "par" {
      run m1() { S, U, A as W, B as Z };
   } par {
      halt;
   }
}

const m = new hh.ReactiveMachine( run2, "run2" );
m.debug_emitted_func = console.log

//console.log( m.pretty_print() );
console.log( "m.inputAndReact(S)" );
m.inputAndReact( "S" )

//m.react();
m.getElementById( "par" ).appendChild( hiphop run m1() { S, U, A as Z } );

console.log( "==================== ADD RUN PARALLEL ==================" );

//console.log(m.pretty_print());
console.log( "m.inputAndReact(U)" );
m.inputAndReact( "U" )
