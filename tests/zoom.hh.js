"use hopscript"

const hh = require( "hiphop" );

function zoom_in_cb() {
   console.log( "********* ZOOOOOOOOOOOOOOOOOM ************" );
}

hiphop module prg( ZOOM_LOCK_TOOGLE, ZOOM_IN ) {
   loop {
      abort now( ZOOM_LOCK_TOOGLE ) {
	 every( now( ZOOM_IN ) ) {
	    hop { zoom_in_cb() };
	 }
      }
      await now( ZOOM_LOCK_TOOGLE );
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
