"use hopscript";

const hh = require( "hiphop" );

hiphop module prg( out O ) {
   emit O( 123 );
   loop {
      {
         signal S=0;
         emit S( 1 );
         yield;
         emit S( preval( S )+1 );
         emit O( val( S ) );
      }
   }
}

exports.prg = new hh.ReactiveMachine(prg, "P19");
