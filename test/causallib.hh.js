import * as hh from "@hop/hiphop";


hiphop module mymod() {
   in A; in B; in R; out O;
   do{
      fork {
	 await (A.now);
      } par {
	 await (B.now);
      }
      emit O();
   } every(R.now)
}



hiphop module prog() {
    in I, A, B, R; out O;
    signal A;
    fork {
       run mymod() { * };
    } par {
        await (O.now);
        emit A();
    }
}

export const mach = new hh.ReactiveMachine(prog, { verbose: -1});
mach.outbuf = "";

try{
   mach.react({A: undefined, B: undefined});
   mach.react('A');
   mach.react('B');
} catch(e) { 
   mach.outbuf += "causality error\n";
}
