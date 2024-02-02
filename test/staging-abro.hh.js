import * as hh from "@hop/hiphop";

const hhfork = hiphop fork {
   await(A.now);
} par {
   await(B.now);
}

const hhdo = hiphop do {
   ${hhfork}
   emit O();
} every(R.now)

const prg = hiphop module() {
   in A; in B; in R; out O;

   ${hhdo}
}

export const mach = new hh.ReactiveMachine(prg, "STAGING-ABRO");
