import * as hh from "@hop/hiphop";

const prg = hiphop module() {
   in A; in B; out O;
	    
   await (A.now);
   await (B.now);
   emit O();
}

export const mach = new hh.ReactiveMachine(prg, "awaitseq");
