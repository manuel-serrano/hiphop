// prog3d, emit a tick every two seconds, or with forced input
import * as hh from "@hop/hiphop";

const prog3 = hiphop module() {
   in R;
   out O;
   signal S = 0;
   let tmt;

   loop {
      L: fork {
	 loop {
	    async (S) {
	       tmt = setTimeout(() => this.notify(Date.now()), 2000);
	    } kill {
	       clearTimeout(tmt);
	    }
	    emit O(S.nowval);
	    yield;
	 }
      } par {
	 await (R.now);
	 pragma { console.log("force tick..."); }
	 emit O(Date.now());
	 break L;
      }
   }
}

const m = new hh.ReactiveMachine(prog3);
let p = Date.now();
m.addEventListener("O", v => {
   console.log("tick", v.nowval - p);
   p = v.nowval;
   m.react()
});
m.react();

setTimeout(() => m.react({R: true}), 2200);
