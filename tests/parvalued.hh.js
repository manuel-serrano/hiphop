"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   out J;
   signal I;

   fork {
      if( I.now ) {
	 emit J( I.nowval );
      }
   } par {
      emit I( 5 );
   }
}

exports.prg = new hh.ReactiveMachine( prg, "parvalued" );
