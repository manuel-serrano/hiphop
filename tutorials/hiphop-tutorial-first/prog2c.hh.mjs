// prog2c.hh.mjs
import * as hh from "@hop/hiphop";

const prog2 = hiphop module() {
   in A, B;
   out O;

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
