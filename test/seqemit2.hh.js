#!/bin/env -S node --enable-source-maps --no-warnings --loader @hop/hiphop/lib/hiphop-loader.mjs
import * as hh from "@hop/hiphop";

const prg = hiphop module() {
   inout I combine (x, y) => x + y;

   if (I.now) {
      pragma { mach.outbuf += "emit\n"; }
   }
   emit I(10);
}

export const mach = new hh.ReactiveMachine(prg);
mach.outbuf = "";

try {
   const res = JSON.stringify(mach.react({I: 1}));
   mach.outbuf += res;
} catch (e) {
   mach.outbuf += e.message;
}
mach.outbuf += "\n";

if (process.env.HIPHOP_TEST) {
   console.log(mach.name() + "...");
   console.log(mach.outbuf);
}

