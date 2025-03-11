import * as hh from "@hop/hiphop";

hiphop module prg() {
   in IN combine (x, y) => x + y;
	 
   emit IN( ${5} );
   async (){
      mach.outbuf += ( "receive " + IN.nowval ) + "\n";
      this.notify( undefined, false );
   }
}

export const mach = new hh.ReactiveMachine( prg, "" );
mach.outbuf = "";
mach.debug_emitted_func = val => {
   mach.outbuf += (val.toString() ? "[ '" + val + "' ]\n" : "[]\n");
}

mach.react({IN: 5});
mach.react({IN: 5});
mach.react({IN: 5});
