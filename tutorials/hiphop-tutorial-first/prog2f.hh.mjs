// prog2f.hh.mjs
import * as hh from "@hop/hiphop";

const prog2 = hiphop module() {
   in A, B, R;
   out O;

   loop {
      R: fork {
	 fork {
	    await immediate(A.now);
	 } par {
	    await immediate(B.now);
	 }
	 emit O();
      } par {
	 await (R.now);
	 break R;
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
