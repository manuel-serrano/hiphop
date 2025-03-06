// prog3b, emit a tick every two seconds
import * as hh from "@hop/hiphop";

const prog3 = hiphop module() {
   inout O;
   signal S;

   loop {
      async (S) {
	 setTimeout(() => this.notify(), 2000);
      }
      emit O(S.nowval);
      yield;
   }
}

const m = new hh.ReactiveMachine(prog3); 
m.addEventListener("O", v => { console.log("tick"); m.react()});
m.react();
