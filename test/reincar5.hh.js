import * as hh from "@hop/hiphop";

const events = [{},{},{},{},{}];

const prg = hiphop module() {
   inout I, O;
   loop {
      signal L;
      emit L();
      yield;
      pragma { mach.outbuf += `L.now=${L.now}\n`; }
      
   }
}

const opts = {"name":"rnc", native: false};
export const mach = new hh.ReactiveMachine(prg, opts);
mach.outbuf = "";

events.forEach((e, i) => {
   mach.react();
});

