"use hopscript"

const hh = require("hiphop");

hiphop module prg( in I, X, Y ) {
   emit Y();
}

var m = new hh.ReactiveMachine( prg );
m.debug_emitted_func = console.log

m.inputAndReact( "I" );
m.inputAndReact( "X", 15 );
m.react();
m.inputAndReact( "Y" );
