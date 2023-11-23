"use @hop/hiphop";
"use strict";

hiphop module M() {
   inout a = 99999;
   host {mach.outbuf += ( "a=", a.nowval ) + "\n" };
}

import * as hh from "@hop/hiphop";
export const mach = new hh.ReactiveMachine( M );

// test that default arguments are correctly overriden
mach.react( {a: 33} );
