import * as hh from "@hop/hiphop";

hiphop module P14() {
   in I;
   inout O1 combine (x, y) => x * y;
   inout O2 combine (x, y) => x * y;

   if (O1.now) {
      emit O2(100);
   }
   yield
   if (O2.now) {
      emit O1(10);
   }
}

export const mach = new hh.ReactiveMachine(P14, { sweep: true, dumpNets: true, verbose: 0 });
mach.outbuf = "";

mach.addEventListener("O2", v => mach.outbuf += "O2=" + v.nowval + "\n");
mach.addEventListener("O1", v => mach.outbuf += "O1=" + v.nowval + "\n");

function react(sigs) {
   const s = mach.save();
   mach.react(sigs);
   mach.restore(s);
}

react({I: 1});
react({I: 1, O2: 1});
react({O1: 2});

