#!/bin/env -S node --enable-source-maps --no-warnings --loader @hop/hiphop/lib/hiphop-loader.mjs
// 
// == HipHop Hello World ==
//
// Three diffent ways to execute:
//    1 ./hello.hh.mjs
//    2. node --enable-source-maps --no-warnings --loader @hop/hiphop/lib/hiphop-loader.mjs hello.hh.mjs
//    3. ./node_module/@hop/hiphop/bin/hhc.mjs hello.hh.js -o hello.mjs && nodejs --enable-source-maps hello.mjs
//
import * as hh from "@hop/hiphop";

const prg = hiphop module() {
   in A; in B; in R;
   out O;
   
   do {
      fork {
         await (A.now);
      } par {
         await (B.now);
      }
      emit O(A.nowval + B.nowval);
   } every (R.now)
}

const mach = new hh.ReactiveMachine(prg);
mach.addEventListener("O", evt => console.log("Hello World", evt.nowval));

for (let s of [{A: 1}, {A: 2, B: 3}, {A: 4}, {B: 5}, {R: true}, {B: 3}, {B: 5}, {A: 10}]) {
   mach.react(s);
}
