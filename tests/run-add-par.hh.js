"use hiphop";
"use hopscript";

var hh = require( "hiphop" );

hiphop module m1( S, U, W, Z ) {
   fork {
      if( S.now ) emit W();
   } par {
      if( U.now ) emit Z();
   }
}

hiphop module run2( S, U, A, B ) {
   fork "par" {
      run m1( S, U, W as A, Z as B );
   } par {
      halt;
   }
}

var m = new hh.ReactiveMachine( run2, "run2" );
m.debug_emitted_func = console.log

//console.log( m.pretty_print() );
console.log( "m.inputAndReact(S)" );
m.inputAndReact( "S" )

//m.react();
m.getElementById( "par" ).appendChild( hiphop run m1( S, U, Z as A ) );

console.log( "==================== ADD RUN PARALLEL ==================" );

//console.log(m.pretty_print());
console.log( "m.inputAndReact(U)" );
m.inputAndReact( "U" )
