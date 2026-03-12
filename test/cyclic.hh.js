#!/bin/env -S node --enable-source-maps --no-warnings --loader @hop/hiphop/lib/hiphop-loader.mjs
import * as hh from "@hop/hiphop";

const prg = hiphop module() {
   inout A, B;
   in C;

   if (C.now) {
      if (A.now) {
	 emit B(1);
      }
   } else {
      if (B.now) {
	 emit A(1);
      }
   }
}

export const mach = new hh.ReactiveMachine(prg);
mach.outbuf = "";

mach.outbuf += JSON.stringify(mach.react({C: 1, A: 2}));
mach.outbuf += "\n";
mach.outbuf += JSON.stringify(mach.react({}));
mach.outbuf += "\n";
mach.outbuf += JSON.stringify(mach.react({B: 1}));
mach.outbuf += "\n";
mach.outbuf += JSON.stringify(mach.react({C: 2}));
mach.outbuf += "\n";

if (process.env.HIPHOP_TEST) {
   console.log(mach.name() + "...");
   console.log(mach.outbuf);
}

