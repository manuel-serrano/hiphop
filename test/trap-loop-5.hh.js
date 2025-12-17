#!/bin/env -S node --enable-source-maps --no-warnings --loader @hop/hiphop/lib/hiphop-loader.mjs
import * as hh from "@hop/hiphop";

const prg = hiphop module() {
   in A, B, R; out O;

   loop {
      T1: fork {
	 pragma { mach.outbuf += ("S\n"); }
	 yield;
	 break T1;
      }
      pragma { mach.outbuf += ("loop " + mach.age() + "\n"); }
   }
}
 
const opts = process.env.HIPHOP_TEST_RNCA
   ? { name: "rnca", loopUnroll: false, reincarnation: true }
   : (process.env.HIPHOP_TEST_LOOP
      ? { name: "unroll", loopUnroll: true, reincarnation: false }
      : { name: "default" });

export const mach = new hh.ReactiveMachine(prg, opts);
mach.outbuf = "";

mach.react();
mach.react();
mach.react();
mach.react();

if (process.env.HIPHOP_TEST) {
   console.log(mach.name() + "...");
   console.log(mach.outbuf);
}
