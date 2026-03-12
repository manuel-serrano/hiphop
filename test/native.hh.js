import * as hh from "@hop/hiphop";

const prg =  hiphop module() {
   out S = 1;

   emit S(2);
   yield;
   
   emit S(3);
   yield;
   emit S(4);
   yield;
   yield;
   yield;
}

export const mach = new hh.ReactiveMachine(prg);
mach.outbuf = "";

for (let i = 0; i < 5; i++) {
   mach.react();
   mach.outbuf += JSON.stringify(mach.signals.S);
   mach.outbuf += "\n";
}

if (process.env.HIPHOP_TEST) {
   console.log(mach.name() + "...");
   console.log(mach.outbuf);
}

