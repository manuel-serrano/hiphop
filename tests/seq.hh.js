"use @hop/hiphop";

import * as hh from "@hop/hiphop";

hiphop module t() {
   in n;
   host { console.log( "1", n.nowval ) }
   host { console.log( "2" ) }
}

new hh.ReactiveMachine( t ).react( {n: 34} );
