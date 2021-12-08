HipHop: Reactive Web programming
================================

[![Travis](https://api.travis-ci.com/manuel-serrano/hiphop.svg)](https://travis-ci.com/manuel-serrano/hiphop/builds)

__Hiphop.js__ is a [Hop.js](http://hop-dev.inria.fr) DSL for
orchestrating web applications.


```javascript
"use hiphop"
"use hopscript"

const hh = require("hiphop");

hiphop module prg(in A, in B, in R, out O) {
   do {
      fork {
         await (A.now);
      } par {
         await (B.now);
      }
      emit O();
   } every (R.now)
}

const m = new hh.ReactiveMachine(prg, "ABRO");
m.addEventListener("O", e => console.log("got: ", e));
m.react({ A: 1 }, { B: 2 }, { R: true }, { A: 3, B: 4 });
```
