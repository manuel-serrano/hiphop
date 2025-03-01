"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";
import fs from "fs";
import { format } from "util";

function make_atom(i) {
   return hiphop do {
      hop { mach.cnt1 += i; }
   } every(G0.now)
}

function make_atom2(i) {
   return hiphop loop {
      await immediate(G0.now);
      hop { mach.cnt2 += i; }
      yield;
   }
}

function make_atom3(i) {
   return hiphop {
      every immediate(G0.now) {
	 hop { mach.cnt3 += i; }
      }
   }
}

hiphop module prg() {
   signal G0;

   fork "par" {
      loop {
	 emit G0();
	 yield;
      }
   } par {
      ${make_atom(1)}
   } par {
      ${make_atom2(2)}
   }
}

export const mach = new hh.ReactiveMachine(prg, { name: "every-dyn-load", sweep: false, dynamic: true });
mach.outbuf = "";
mach.cnt1 = mach.cnt2 = mach.cnt3 = 0;
mach.debug_emitted_func = val => {
   mach.outbuf += format(val) + "\n";
}

mach.react()
mach.react()

mach.outbuf += ("add 1") + "\n";
mach.getElementById("par").appendChild(make_atom2(100));
mach.react()
mach.react()


mach.outbuf += ("add 2") + "\n";
mach.getElementById("par").appendChild(make_atom(1000));
mach.react()

mach.react()
mach.react()

mach.outbuf += ("add 3") + "\n";
mach.getElementById("par").appendChild(make_atom3(10000));
mach.react()
mach.react()
mach.outbuf += "cnt=" + `${mach.cnt1}-${mach.cnt2}-${mach.cnt3}` + "\n";

