#!/bin/env -S node --enable-source-maps --no-warnings --loader @hop/hiphop/lib/hiphop-loader.mjs
import * as hh from "@hop/hiphop";

const events = [null,null,null];

const prg = hiphop module() {
   loop {
      signal g4189;
      fork {
         emit g4189(84);
         yield;
      } par {
	 pragma { mach.outbuf += ((g4189.pre ? g4189.preval : "-") + "\n") }
      }
   }
}

export const mach = new hh.ReactiveMachine(prg);
mach.outbuf = "";
events.forEach((e, i) => mach.react(e));

if (process.env.HIPHOP_TEST) {
   console.log(mach.outbuf);
}

// NODE_OPTIONS="--enable-source-maps --no-warnings --loader @hop/hiphop/lib/hiphop-loader.mjs" node new-unroll.hh.mjs
