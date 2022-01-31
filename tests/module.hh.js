"use @hop/hiphop";
"use strict";

hiphop module M() {
   inout a = 99999;
   host {console.log( "a=", a.nowval ) };
}

import * as hh from "@hop/hiphop";
const m = new hh.ReactiveMachine( M );

// test that default arguments are correctly overriden
m.react( {a: 33} );
