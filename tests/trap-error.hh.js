"use hiphop";
"use hopscript"

var hh = require( "hiphop" );

hiphop module sub() {
   break T;
}

hiphop module main( O, S ) {
   T: {
      run sub();
   }
}

prg = new hh.ReactiveMachine( main, "abort-error" );
exports.prg = prg;


