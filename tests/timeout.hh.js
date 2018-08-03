"use hopscript"

const hh = require( "hiphop" );

hiphop module prg( X=1, Y, Z ) {
   T: {
      signal __internal=-1;

      loop {
	 if( preval( __internal ) === -1 ) {
	    emit __internal( val( X ) + 5 );
	 }
	 if( val( __internal ) === 0 ) {
	    break T;
	 }
	 async {
	    setTimeout( function( self ) {
	       self.notifyAndReact(); }, 500, this );
	 }
	 emit Y();
	 emit __internal( preval( __internal ) - 1 );
      }
   }
   emit Z();
}

var m = new hh.ReactiveMachine( prg );

m.addEventListener( "Y", function( evt ) {
   console.log( "Y emitted" );
});

m.addEventListener( "Z", function( evt ) {
   console.log( "Z emitted" );
});

m.react();
