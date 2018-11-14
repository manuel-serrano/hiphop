"use hiphop";
"use hopscript";

const hh = require( "hiphop" );

hiphop module prg( out O ) {
   emit O( 123 );
   loop {
      {
         signal S=0;
         emit S( 1 );
         yield;
         emit S( S.preval + 1 );
         emit O( S.nowval );
      }
   }
}

exports.prg = new hh.ReactiveMachine(prg, "P19");
