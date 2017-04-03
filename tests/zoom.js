"use hopscript"

const hh = require("hiphop");

const zoom_in_cb = function() {
   console.log("********* ZOOOOOOOOOOOOOOOOOM ************");
}

const prg =
      <hh.module ZOOM_LOCK_TOOGLE ZOOM_IN>
	<hh.loop>
	  <hh.abort ZOOM_LOCK_TOOGLE>
	    <hh.every ZOOM_IN>
	      <hh.atom apply=${zoom_in_cb}/>
	    </hh.every>
	  </hh.abort>
	  <hh.await ZOOM_LOCK_TOOGLE/>
	</hh.loop>
      </hh.module>

const m = new hh.ReactiveMachine(prg);
m.debug_emitted_func = console.log

m.react()
m.inputAndReact("ZOOM_IN")
m.inputAndReact("ZOOM_IN")
m.inputAndReact("ZOOM_LOCK_TOOGLE")
m.inputAndReact("ZOOM_IN")
m.inputAndReact("ZOOM_IN")
m.inputAndReact("ZOOM_LOCK_TOOGLE")
m.inputAndReact("ZOOM_IN")
