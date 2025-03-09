import * as hh from "@hop/hiphop";

hiphop module example() {
   in I; out O;
      
   if (I.now) emit I();
   emit O();
}

export const mach = new hh.ReactiveMachine(example, { verbose: -1 });
mach.outbuf = "";

try {
    mach.react();
} catch( e ) { 
   mach.outbuf += "causality error\n";
}
