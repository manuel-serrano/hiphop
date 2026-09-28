#!/bin/env -S node --enable-source-maps --no-warnings --loader @hop/hiphop/lib/hiphop-loader.mjs
import * as hh from "@hop/hiphop";

let msg = "";
export let mach;

const prg = hiphop module() {
   signal S;

   if (S.now) {
      pragma { msg += "emit"; }
   }
   emit S();
}

try {
   mach = new hh.ReactiveMachine(prg, { name: "seqemit", verbose: -1 });
   msg = "";

   msg += JSON.stringify(mach.react());
} catch (e) {
   if (e.message === "hiphop: causality error") {
      msg += "Causality error.";
   } else {
      msg = e.message;
   }
}

mach.outbuf = msg + "\n";

if (process.env.HIPHOP_TEST) {
   console.log(mach.name() + "...");
   console.log(msg);
}

