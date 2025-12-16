#!/bin/env -S node --enable-source-maps --no-warnings --loader @hop/hiphop/lib/hiphop-loader.mjs
import * as hh from "@hop/hiphop";

function consoleLog(...args) {
   mach.outbuf += args.join("").toString() + "\n";
}

const events = [{},{}];

const prg = hiphop module() {
   loop {
      signal g8130;

      fork {
         emit g8130(10);
         yield;
	 pragma { mach.outbuf += `N1=${g8130.now}\n`; };
      }
   }
}

export const mach = new hh.ReactiveMachine(prg);
mach.outbuf = "";

events.forEach((e, i) => { mach.react(e); });

