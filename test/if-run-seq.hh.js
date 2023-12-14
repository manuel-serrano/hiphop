"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

const pauseModule = hiphop module() { yield }

export const mach = new hh.ReactiveMachine(
   hiphop module(resolve) {
      loop {
	 host { mach.outbuf += ( ">>> start" ) + "\n" }
	 if (1) {
	    run pauseModule() {};
	 } else {
	    yield;
	 }
	 host { mach.outbuf += ( ">>> end" ) + "\n" }
	 host { resolve(false); }
      }
   } );

mach.outbuf = "";
mach.debug_emitted_func = val => val;
mach.batchPromise = new Promise((res, rej) => mach.init(res));
mach.react();
setTimeout( () => mach.react(), 200 );
