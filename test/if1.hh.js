import * as hh from "@hop/hiphop";

const prg = hiphop module() {
   in I1; inout O1; in I2; inout O2;
   loop {
      if (I1.now) emit O1();
      if (I2.nowval > 2) emit O2();
      yield;
   }
}

export const mach = new hh.ReactiveMachine(prg, "if1" );
