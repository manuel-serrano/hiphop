#!/bin/env -S node --enable-source-maps --no-warnings --loader @hop/hiphop/lib/hiphop-loader.mjs
import * as hh from "@hop/hiphop";

function consoleLog(...args) {
   mach.outbuf += args.join("").toString() + "\n";
}

const events = [{},{},{}];

const prg = hiphop module() {
   loop {
      signal L = 0 combine (x, y) => (x + y);
      if (L.pre) {
	 pragma { consoleLog("pre/0-", mach.age()); }
         yield;
      } else {
	 pragma { consoleLog("no pre/0-", mach.age()); }
         yield;
	 pragma { consoleLog("emit/1-", mach.age()); }
         emit L(7);
	 yield;
	 if (L.pre) {
	    pragma { consoleLog("pre/1-", mach.age()); }
	 }
      }
   }
}

export const mach = new hh.ReactiveMachine(prg);
mach.outbuf = "";

events.forEach((e, i) => { mach.react(e); });

if (process.env.HIPHOP_TEST) {
   console.log(mach.outbuf);
}
