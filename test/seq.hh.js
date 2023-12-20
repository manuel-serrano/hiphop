import * as hh from "@hop/hiphop";

hiphop module t() {
   in n;
   pragma { mach.outbuf +=  "1 " + n.nowval + "\n"; }
   pragma { mach.outbuf += "2\n"; }
}

export const mach = new hh.ReactiveMachine(t);
mach.outbuf = "";
mach.react({n: 34});
