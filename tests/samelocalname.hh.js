"use hiphop"
"use hopscript"

const hh = require( "hiphop" );

hiphop module prg( in SAME=1 ) {
   hop { console.log( "1:", nowval( SAME ) ) }
   emit SAME( 2 );
   {
      signal S1=5, SAME=10;
      hop { console.log( "before2:", nowval( SAME ) ); }
      hop { console.log( "before2bis:", nowval( SAME ) ); }
      {
	 signal SAME=100;
	 hop { console.log( "2:", nowval( SAME ) ); }
      }

      hop { console.log( "after2:", nowval( SAME ) ); }
   }

   hop { console.log( "3:", nowval( SAME ) ) }
}

var m = new hh.ReactiveMachine( prg );

m.react();
