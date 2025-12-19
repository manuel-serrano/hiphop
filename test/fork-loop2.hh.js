#!/bin/env -S node --enable-source-maps --no-warnings --loader @hop/hiphop/lib/hiphop-loader.mjs
import * as hh from "@hop/hiphop";

let cnt = 0;

const prg = hiphop module() {
   loop {
      fork {
	 pragma { cnt += 1; }
      } par {
         fork {
	    pragma { cnt += 10; }
	    yield;
         } par {
	    pragma { cnt += 100; }
         }
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

cnt = 0; mach.react(); mach.outbuf += (cnt + "\n");
cnt = 0; mach.react(); mach.outbuf += (cnt + "\n");
cnt = 0; mach.react(); mach.outbuf += (cnt + "\n");
cnt = 0; mach.react(); mach.outbuf += (cnt + "\n");

if (process.env.HIPHOP_TEST) {
   console.log(mach.outbuf);
}
