"use @hop/hiphop"
"use hopscript"

import { ReactiveMachine } from "@hop/hiphop";
import { httpRequest, HttpRequest } from "@hop/hiphop/modules/http.hh.js";
import { timeout, Timeout } from "@hop/hiphop/modules/timeout.hh.js";

hiphop module getHttp() implements HttpRequest {
   in URL;
   let redirect = 0;

   yield;
   exit: loop {
      await immediate(URL.now);
      run httpRequest(URL.nowval) { * };
      if (response.nowval.statusCode === 301) {
	 if (redirect++ >= 10) {
	    break exit;
	 } else {
	    emit URL(response.nowval.headers.location);
	 }
      } else {
	 break exit;
      }
   }
}


hiphop module prg() implements HttpRequest {
   in URL;
   signal Timeout;

   exit: fork {
      run getHttp() { * };
      break exit;
   } par {
      run timeout(2000) { * };
      emit response({statusCode: 408});
      break exit;
   }
}

export const mach = new ReactiveMachine(prg);
mach.addEventListener("response", v => {
   console.log("response=", v.nowval.statusCode, v.nowval.buffer);
});
/* mach.addEventListener("pulse", v => {                               */
/*    console.log("pulse=", v.nowval.statusCode, v.nowval.buffer.length); */
/* });                                                                 */
mach.react({});
mach.react({URL: "https://www.inria.fr"});

// npm install
// node --enable-source-maps --no-warnings --loader ./node_modules/@hop/hiphop/lib/hiphop-hook.mjs ./http.hh.js
