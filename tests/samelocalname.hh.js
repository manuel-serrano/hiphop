"use hiphop"
"use hopscript"

const hh = require( "hiphop" );

hiphop module prg( in SAME=1 ) {
   emit SAME( 2 );
   hop { console.log( "1:", SAME.nowval ) }
   {
      signal S1=5, SAME=10;
      hop { console.log( "before2:", SAME.nowval ); }
      hop { console.log( "before2bis:", SAME.nowval ); }
      {
	 signal SAME=100;
	 hop { console.log( "2:", SAME.nowval ); }
      }

      hop { console.log( "after2:", SAME.nowval ); }
   }

   hop { console.log( "3:", SAME.nowval ) }
}

var m = new hh.ReactiveMachine( prg );

m.react();
