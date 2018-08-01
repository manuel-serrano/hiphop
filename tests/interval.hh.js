"use hopscript"

const hh = require( "hiphop" );
const tl = hh.timelib;

hiphop module prg() {
   ${ <tl.interval value=${100} countApply=${() => 3}>
	${ hiphop hop { console.log( "-----------" ) } }
	<tl.interval value=${10} countValue=${5}>
	   ${ hiphop hop { console.log( "." ) } }
        </tl.interval>
      </tl.interval> }
   hop { console.log( "-----------" ) }
}

const m = new hh.ReactiveMachine( prg );

m.react();

