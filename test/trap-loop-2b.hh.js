#!/bin/env -S node --enable-source-maps --no-warnings --loader @hop/hiphop/lib/hiphop-loader.mjs
import * as hh from "@hop/hiphop";

const prg = hiphop module() {
   in A, B, R; out O;

   loop {
      pragma { mach.outbuf += ("loop " + mach.age() + "\n"); }
      T1: fork {
	 pragma { mach.outbuf += ("S1\n"); }
	 yield;
	 break T1;
      }
   }
}
 
const opts = process.env.HIPHOP_TEST === "rnca"
   ? { name: "rnca", loopUnroll: false, reincarnation: true, native: false }
   : (process.env.HIPHOP_TEST === "unroll"
      ? { name: "unroll", loopUnroll: true, reincarnation: false, native: false }
      : { name: "default" });
export const mach = new hh.ReactiveMachine(prg, opts);
mach.outbuf = "";

mach.react();
mach.react();
mach.react();
mach.react();

if (process.env.HIPHOP_TEST) {
   console.log(mach.outbuf);
}
