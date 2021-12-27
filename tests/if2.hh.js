"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

let s1 = true;
let s2 = false;

hiphop module prg(O1, O2) {
   loop {
      if(${ s1 }) emit O1();
      if(${ s2 }) emit O2();
      yield;
   }
}

let m = new hh.ReactiveMachine(prg);
m.debug_emitted_func = console.log

m.react()
s1 = false; // didnt change anyting
m.react()
