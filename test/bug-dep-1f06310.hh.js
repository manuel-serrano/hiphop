import * as hh from "@hop/hiphop";

function consoleLog(...args) {
   mach.outbuf += args.join("").toString() + "\n";
}

hiphop module prg(resolve) {
   signal __internal = 9999;

   consoleLog("YEP ", __internal.preval);
}

export const mach = new hh.ReactiveMachine(prg, { name: "bug-dep-1f06310" });
mach.outbuf = "";

consoleLog("--------------- ", mach.age());
mach.react();
consoleLog("--------------- ", mach.age());

if (process.env.HIPHOP_TEST) {
   console.log(mach.name() + "...");
   console.log(mach.outbuf);
}
