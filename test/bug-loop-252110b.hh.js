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

const opts = {"name":"new unroll","verbose":-1,"sweep":0, "compiler": "new", "loopUnroll": true, "reincarnation": false, "loopDup": false};

export const mach = new hh.ReactiveMachine(prg, opts);
mach.outbuf = "";
events.forEach((e, i) => { mach.outbuf += (i + ': ' + JSON.stringify(mach.react(e)) + '\n') });
