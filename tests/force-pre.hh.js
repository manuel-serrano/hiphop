"use @hop/hiphop"
"use hopscript"

import * as hh from "@hop/hiphop";

try {
   hiphop module prg( O=0 ) {
      emit O( O.nowval );
   }
} catch( e ) {
   console.log( "error: self update" );
}
