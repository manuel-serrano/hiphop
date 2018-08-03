"use hopscript"

const hh = require( "hiphop" );

hiphop module prg( in SAME=1 ) {
   hop { console.log( "1:", val( SAME ) ) }
   emit SAME( 2 );
   {
      signal S1=5, SAME=10;
      hop { console.log( "before2:", val( SAME ) ); }
      hop { console.log( "before2bis:", val( SAME ) ); }
      {
	 signal SAME=100;
	 hop { console.log( "2:", val( SAME ) ); }
      }

      hop { console.log( "after2:", val( SAME ) ); }
   }

   hop { console.log( "3:", val( SAME ) ) }
}

var m = new hh.ReactiveMachine( prg );

m.react();
