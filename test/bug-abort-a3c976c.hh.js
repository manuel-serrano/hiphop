import * as hh from "@hop/hiphop";

const events = [{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{}];

const prg = hiphop module() {
  {
    signal g77580 combine (x, y) => x;
    {
      {
        signal g77581 combine (x, y) => x;
        abort (((this.g77580.now || this.g77580.now) || (this.g77580.now && this.g77581.pre))) {
          yield;
        }
      }
      {
        fork {
          ;
        } par {
          yield;
        }
        emit g77580(26);
      }
    }
  }
}

const opts = {"name":"new unroll","verbose":-1,"sweep":0, "compiler": "new", "loopUnroll": true, "reincarnation": false, "loopDup": false};

export const mach = new hh.ReactiveMachine(prg, opts);
mach.outbuf = "";
events.forEach((e, i) => { mach.outbuf += (i + ': ' + JSON.stringify(mach.react(e)) + '\n') });
