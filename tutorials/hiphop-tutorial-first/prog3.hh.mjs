// prog3
import * as hh from "@hop/hiphop";

const prog3 = hiphop module() {
   inout O;
   signal S;
   
   async (S) {
      setTimeout(() => this.notify(10), 1000);
   }
   emit O(10);
}

const m = new hh.ReactiveMachine(prog3); 
m.addEventListener("O", v => console.log(v));
m.react();
