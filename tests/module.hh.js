"use hiphop";
"use strict";

hiphop module M( a = 99999 ) {
   hop {console.log( "a=", a.nowval ) };
}

const hh = require( "hiphop" );
const m = new hh.ReactiveMachine( M );

// test that default arguments are correctly overriden
m.react( {a: 33} );
