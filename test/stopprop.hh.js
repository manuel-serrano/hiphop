"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   out O;
   loop {
      emit O();
      yield;
   }
}

export const mach = new hh.ReactiveMachine( prg, "foo" );
mach.outbuf = "";

mach.addEventListener( "O", function( evt ) {
   mach.outbuf += ("first " + evt.signame + "\n");
});

mach.addEventListener( "O", function( evt ) {
   evt.stopPropagation();
   mach.outbuf += ("second " + evt.signame + "\n");
});

mach.addEventListener( "O", function( evt ) {
   mach.outbuf += ("third " + evt.signame + "\n");
});

