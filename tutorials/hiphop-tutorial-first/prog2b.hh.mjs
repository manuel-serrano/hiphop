// prog2b.hh.mjs
import * as hh from "@hop/hiphop";

const prog2 = hiphop module() {
   in A, B;
   out O;

   exit: fork {
      loop {
	 if (A.now) break exit;
	 yield;
      }
   } par {
      loop {
	 if (B.now) break exit;
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
