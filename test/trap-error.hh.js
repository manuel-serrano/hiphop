import * as hh from "@hop/hiphop";

hiphop module sub() {
   break T;
}

hiphop module main() {
   out O, S;
   T: {
      run sub() {};
   }
}

export let mach = undefined;

try {
   mach = new hh.ReactiveMachine(main, "trap-error");
} catch (e) {
   mach = new hh.ReactiveMachine(hiphop module() {}, "trap-error");
   mach.outbuf = "unbound trap\n";
}


