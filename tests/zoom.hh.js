"use hiphop";
"use hopscript";

const hh = require( "hiphop" );

function zoom_in_cb() {
   console.log( "********* ZOOOOOOOOOOOOOOOOOM ************" );
}

hiphop module prg( ZOOM_LOCK_TOOGLE, ZOOM_IN ) {
   loop {
      abort( ZOOM_LOCK_TOOGLE.now ) {
	 every( ZOOM_IN.now ) {
	    hop { zoom_in_cb() };
	 }
      }
      await( ZOOM_LOCK_TOOGLE.now );
   }
}

const m = new hh.ReactiveMachine( prg );
m.debug_emitted_func = console.log

m.react()
m.inputAndReact( "ZOOM_IN" )
m.inputAndReact( "ZOOM_IN" )
m.inputAndReact( "ZOOM_LOCK_TOOGLE" )
m.inputAndReact( "ZOOM_IN" )
m.inputAndReact( "ZOOM_IN" )
m.inputAndReact( "ZOOM_LOCK_TOOGLE" )
m.inputAndReact( "ZOOM_IN" )
