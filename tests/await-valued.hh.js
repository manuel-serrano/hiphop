"use hopscript"

var hh = require( "hiphop" );

function foo( evt ) {
   console.log( "foo called by", evt.signalName, "with value", evt.signalValue );
}

var inSig = {accessibility: hh.IN};
var outSig = {accessibility: hh.OUT};

hiphop module prg( in I, out O ) {
   await now( I );
   emit O( val( I ) );
}

var m = new hh.ReactiveMachine( prg, "awaitvalued" );
m.addEventListener( "O", foo );

exports.prg = m;
