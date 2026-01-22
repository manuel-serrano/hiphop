#!/bin/env -S node --enable-source-maps --no-warnings --loader @hop/hiphop/lib/hiphop-loader.mjs
import * as hh from "@hop/hiphop";

let buf = "";

const events = [null,null, null];

let X = 0;

function buglog(s) {
   buf += s;
}

const prg = hiphop module() {
   loop {
      signal S;

      buglog(" " + mach.age() + " ");
      yield;
      if (S.pre) {
	 buf += "true ";
      } else {
	 buf += "false ";
	 emit S(21);
      }
   }
}


const opts = process.env.HIPHOP_TEST === "reincarnation"
   ? { name: "rnca", loopUnroll: false, reincarnation: true, native: false }
   : (process.env.HIPHOP_TEST === "unroll"
      ? { name: "unroll", loopUnroll: true, reincarnation: false, native: false }
      : { name: "default" });
export const mach = new hh.ReactiveMachine(prg, opts);
mach.outbuf = "";

events.forEach((e, i) => {
   buf = "";
   let s = JSON.stringify(mach.reactDebug(e));
   mach.outbuf += (mach.name() + '[' + i + ']: '
      + buf + s + '\n');
});

if (process.env.HIPHOP_TEST) {
   console.log(mach.outbuf);
}
