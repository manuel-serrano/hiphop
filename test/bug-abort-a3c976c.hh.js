import * as hh from "@hop/hiphop";

const events = [{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{}];

const prg = hiphop module() {
  {
    signal g77580 combine (x, y) => x;
    {
      {
        signal g77581 combine (x, y) => x;
        abort {
          yield;
        } when (((this.g77580.now || this.g77580.now) || (this.g77580.now && this.g77581.pre)))
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

export const mach = new hh.ReactiveMachine(prg, { verbose: -1 });
mach.outbuf = "";
events.forEach((e, i) => { mach.outbuf += (i + ': ' + JSON.stringify(mach.react(e)) + '\n') });
