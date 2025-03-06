// prog2e.hh.mjs
import * as hh from "@hop/hiphop";

const prog2 = hiphop module() {
   in A, B, R;
   out O;

   loop {
      R: fork {
	 fork {
	    A: loop {
	       if (A.now) break A;
	       yield;
	    }
	 } par {
	    B: loop {
	       if (B.now) break B;
	       yield;
	    }
	 }
	 emit O();
      } par {
	 loop {
	    yield;
	    if (R.now) break R;
	 }
      }
   }
}

const m = new hh.ReactiveMachine(prog2);
m.addEventListener("O", v => console.log("got O", m.age()));

m.react();
m.react({B: true});
m.react();
m.react({B: true});
m.react();
m.react({A: true});
m.react();
m.react({A: true, B: true});
m.react({A: true, B: true});
m.react({R: true});
m.react();
m.react({B: true});
m.react({R: true});
m.react({A: true});
m.react({B: true});
