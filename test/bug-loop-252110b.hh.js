import * as hh from "@hop/hiphop";

const events = [{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{}];

const prg = hiphop module() {
   loop {
      if (true) {
         loop {
            yield;
         }
      }
   }
}

export const mach = new hh.ReactiveMachine(prg);
mach.outbuf = "";
events.forEach((e, i) => { mach.outbuf += (i + ': ' + JSON.stringify(mach.react(e)) + '\n') });
