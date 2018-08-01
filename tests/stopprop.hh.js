"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( O ) {
   loop {
      emit O();
      yield;
   }
}

var m = new hh.ReactiveMachine( prg, "foo" );

m.addEventListener( "O", function( evt ) {
   console.log( "first", evt );
});

m.addEventListener( "O", function( evt ) {
   evt.stopPropagation();
   console.log( "second", evt );
});

m.addEventListener( "O", function( evt ) {
   console.log( "third", evt );
});

exports.prg = m;
