// prog3c, emit a tick every two seconds, with a logical time stamp
import * as hh from "@hop/hiphop";

const prog3 = hiphop module() {
   inout O;
   signal S = 0;

   loop {
      async (S) {
	 setTimeout(() => this.notify(S.preval + 1), 2000);
      }
      emit O(S.nowval);
      yield;
   }
}

const m = new hh.ReactiveMachine(prog3); 
m.addEventListener("O", v => { console.log("tick", v.nowval); m.react()});
m.react();
