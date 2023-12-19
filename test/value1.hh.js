import * as hh from "@hop/hiphop";

hiphop module prg() {
   out O = 5 combine (x, y) => x + y;
   loop {
      emit O(${5});
      emit O(${10});
      yield;
   }
}

export const mach = new hh.ReactiveMachine(prg, "value1");
