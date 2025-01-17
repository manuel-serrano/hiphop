import * as hh from "@hop/hiphop";

hiphop module P15() {
   in I, J;

   fork {
      if (I.now) {
	 emit O1(1);
      }
   } par {
      if (J.now) {
	 if (O1.now) {
	    emit O2(2);
	 } else {
	    emit O3(3);
	 }
      }
   }
}

export const mach = new hh.ReactiveMachine(P15, { sweep: true, dumpNets: true, verbose: 1 });
mach.outbuf = "";

mach.addEventListener("O3", v => mach.outbuf += "O3=" + v.nowval + "\n");
mach.addEventListener("O2", v => mach.outbuf += "O2=" + v.nowval + "\n");
mach.addEventListener("O1", v => mach.outbuf += "O1=" + v.nowval + "\n");

function react(sigs) {
   const s = mach.save();
   mach.react(sigs);
   mach.restore(s);
}

react({I: 1});
react({I: 1, J: 1});
react({J: 1});
react();
