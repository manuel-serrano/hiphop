"use @hop/hiphop";
"use strict";

hiphop module M() {
   inout a = 99999;
   host {console.log( "a=", a.nowval ) };
}

import * as hh from "@hop/hiphop";
export const mach = new hh.ReactiveMachine( M );

// test that default arguments are correctly overriden
mach.react( {a: 33} );
