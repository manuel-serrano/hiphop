"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   in I1; inout O1; in I2; inout O2;
   loop {
      if( I1.now ) emit O1();
      if( I2.nowval > 2 ) emit O2();
      yield;
   }
}

exports.prg = new hh.ReactiveMachine( prg, "if1" );
