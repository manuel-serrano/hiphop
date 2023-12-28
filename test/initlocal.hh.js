"use @hop/hiphop";

import * as hh from "@hop/hiphop";

export const mach = new hh.ReactiveMachine(
   hiphop module() {
      out S;
      loop {
	 signal L = 2;

	 emit S(L.nowval);
	 yield;
      }
   } );

mach.outbuf = "";
mach.addEventListener( "S", function (evt) { mach.outbuf += `{ type: '${evt.signame}', nowval: ${evt.nowval} }` + "\n" });
mach.react();
mach.react();
