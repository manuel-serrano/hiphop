"use hopscript"

const hh = require( "hiphop" );
const tl = hh.timelib;

hiphop module prg() {
   EXIT: fork {
      ${ <tl.interval countValue=${5} value=${10}>
	   ${ hiphop hop { console.log( "tick branch 1" ) } }
	 </tl.interval> }
      break EXIT;
   } par {
      ${ <tl.interval countValue=${2} value=${10}>
	   ${ hiphop hop { console.log( "tick branch 2" ) } }
	 </tl.interval> }
      break EXIT;
   }
   hop { console.log( "end" ) }
}

const m = new hh.ReactiveMachine( prg );

m.react();
m.react();
m.react();
