import * as hh from "@hop/hiphop";

function zoom_in_cb() {
   mach.outbuf += "********* ZOOOOOOOOOOOOOOOOOM ************\n";
}

hiphop module prg() {
   inout ZOOM_LOCK_TOOGLE, ZOOM_IN;
   loop {
      abort (ZOOM_LOCK_TOOGLE.now) {
	 every (ZOOM_IN.now) {
	    hop { zoom_in_cb() };
	 }
      }
      await (ZOOM_LOCK_TOOGLE.now);
   }
}

export const mach = new hh.ReactiveMachine( prg );
mach.outbuf = "";
mach.debug_emitted_func = val => {
   mach.outbuf += (val.toString() ? "[ '" + val + "' ]\n" : "[]\n");
}

mach.react()
mach.react({ZOOM_IN: undefined});
mach.react({ZOOM_IN: undefined});
mach.react({ZOOM_LOCK_TOOGLE: undefined});
mach.react({ZOOM_IN: undefined});
mach.react({ZOOM_IN: undefined});
mach.react({ZOOM_LOCK_TOOGLE: undefined});
mach.react({ZOOM_IN: undefined});
