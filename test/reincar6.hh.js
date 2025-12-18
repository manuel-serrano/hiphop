#!/bin/env -S node --enable-source-maps --no-warnings --loader @hop/hiphop/lib/hiphop-loader.mjs
import * as hh from "@hop/hiphop";

function consoleLog(...args) {
   mach.outbuf += args.join("").toString() + "\n";
}

const events = [{},{},{},{}];

const prg = hiphop module() {
   loop {
      signal L;
      emit L();
      pragma { consoleLog("1: L.now=", L.now, " L.pre=", L.pre); }
      yield;
      pragma { consoleLog("2: L.now=", L.now, " L.pre=", L.pre); }
      yield;
      pragma { consoleLog("3: L.now=", L.now, " L.pre=", L.pre); }
      yield;
   }
}

export const mach = new hh.ReactiveMachine(prg);
mach.outbuf = "";

events.forEach((e, i) => { mach.react(e); });

