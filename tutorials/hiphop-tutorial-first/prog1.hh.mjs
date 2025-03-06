// prog1.hh.mjs
import * as hh from "@hop/hiphop";

const prog1 = hiphop module() {
   in ENTER, EXIT;

   pragma { console.log("before loop"); }
   enter: loop {
      if (ENTER.now) break enter;
      yield;
   }

   pragma { console.log("in loop"); }
   
   exit: loop {
      if (EXIT.now) break exit;
      yield;
   }
   
   pragma { console.log("after loop"); }
}

const m = new hh.ReactiveMachine(prog1);

m.react();
m.react({ENTER: true});
m.react();
m.react();
m.react({EXIT: true});
m.react();
