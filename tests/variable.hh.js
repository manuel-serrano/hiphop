"use hiphop"
"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( in sig ) {
   let v = 1;

   every( now( sig ) ) {
      if( nowval( sig ) > v ) hop { v = nowval( sig ) + 1 };

      hop { console.log( "v=", v ) }
      yield;
   }
}

const m = new hh.ReactiveMachine( prg, "variable" );
exports.prg = prg;

m.react()
m.inputAndReact( "sig", 0 );
m.inputAndReact( "sig", 10 );

