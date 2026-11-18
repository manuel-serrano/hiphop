#!/bin/env -S node --enable-source-maps --no-warnings --loader @hop/hiphop/lib/hiphop-loader.mjs
import * as hh from "@hop/hiphop";

const events = [{},{"I":21}];

const S = [ "L", "M" ];

const prg = hiphop module() {
   inout I combine (x, y) => (x + y);
   do {
      signal ... ${S} = 100;
      
      if (L.pre) {
	 ;
      } else {
         emit L(21);
         emit M(M.preval);
         yield;
      }
   } every (I.now);
}

const opts = {"name":"local-dots"};
export const mach = new hh.ReactiveMachine(prg, opts);
mach.outbuf = "";

events.forEach((e, i) => {
   mach.outbuf += (mach.name() + '[' + i + ']: '
      + JSON.stringify(mach.reactDebug(e)) + '\n')
});

if (process.env.HIPHOP_TEST) {
   console.log(mach.outbuf);
}
