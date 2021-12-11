"use hiphop"
"use hopscript"

const hh = require( "hiphop" );

hiphop module prg( O ) {
   async O {
      setTimeout( () => this.notify( 5 ), 3000 );
   }
}

const machine = new hh.ReactiveMachine( prg, "exec" );

machine.addEventListener( "O", function( evt ) {
   console.log( "O emitted!" );
} );

machine.react();
