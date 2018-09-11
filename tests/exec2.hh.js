"use hiphop"
"use hopscript"

const hh = require( "hiphop" );

hiphop module prg( O ) {
   async O {
      setTimeout( () => this.notifyAndReact( 5 ), 3000 );
   }
}

var machine = new hh.ReactiveMachine( prg, "exec" );

machine.addEventListener( "O", function( evt ) {
   console.log( "O emitted!" );
} );

machine.react();
