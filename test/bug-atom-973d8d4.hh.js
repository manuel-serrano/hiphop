"use @hop/hiphop"
"use hopscript"

import { ReactiveMachine } from "@hop/hiphop";

hiphop module prg() {
   signal S, T;

   fork {
      loop {
         emit S(1);
         emit T(1);
         yield;
      }
   } par {
      loop {
         pragma {
            mach.outbuf += "1S=" + " " + S.now + " " + S.nowval + " " + S.preval + "\n";
            mach.outbuf += "1T=" + " " + T.now + " " + T.nowval + " " + T.preval + "\n";
            mach.outbuf += "-----\n";
         }
         pragma {
            mach.outbuf += "2S=" + " " + S.now + " " + S.nowval + " " + S.preval + "\n";
            mach.outbuf += "2T=" + " " + T.now + " " + T.nowval + " " + T.preval + "\n";
            mach.outbuf += "-----\n";
         }
         yield;
      }
   }
}

export const mach = new ReactiveMachine(prg);
mach.outbuf = "";
mach.react();
