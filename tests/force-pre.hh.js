"use @hop/hiphop"
"use hopscript"

import * as hh from "@hop/hiphop";

try {
   hiphop module prg() {
      out O = 0;
      emit O( O.nowval );
   }
} catch( e ) {
   console.log( "error: self update" );
}
