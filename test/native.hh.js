import * as hh from "@hop/hiphop";

const mach = new hh.ReactiveMachine(hiphop module() {
   out S = 1;

   emit S(2);
   yield;
   
   emit S(3);
   yield;
   emit S(4);
   yield;
   yield;
   yield;
});

export const mach = new hh.ReactiveMachine(prg);
mach.outbuf = "";

mach.outbuf += JSON.stringify(mach.reactDebug());
mach.outbuf += "\n";
mach.outbuf += JSON.stringify(mach.reactDebug());
mach.outbuf += "\n";
mach.outbuf += JSON.stringify(mach.reactDebug());
mach.outbuf += "\n";
mach.outbuf += JSON.stringify(mach.reactDebug());
mach.outbuf += "\n";
mach.outbuf += JSON.stringify(mach.reactDebug());
mach.outbuf += "\n";

if (process.env.HIPHOP_TEST) {
   console.log(mach.name() + "...");
   console.log(mach.outbuf);
}

