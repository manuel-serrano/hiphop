"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";
import fs from "fs";
import { format } from "util";

function make_atom(i) {
   return hiphop do {
      hop { mach.outbuf += ("branch " + i) + "\n" };
   } every( G0.now )
}

function make_atom2(i) {
   return hiphop loop {
      await immediate( G0.now );
      hop { mach.outbuf += ("branch " + i) + "\n" };
      yield;
   }
}

function make_atom3(i) {
   return hiphop {
      every immediate( G0.now ) {
	 hop { mach.outbuf += ("branch " + i) + "\n" }
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
      ${make_atom(0)}
   } par {
      ${make_atom2(4)}
   }
}

export const mach = new hh.ReactiveMachine(prg, "");
mach.outbuf = "";
mach.debug_emitted_func = val => {
   mach.outbuf += format(val) + "\n";
}

//mach.outbuf += (machine.ast.pretty_print()) + "\n";

mach.react()
mach.react()

mach.outbuf += ("add 1") + "\n";
mach.getElementById("par").appendChild(make_atom2(1));
mach.react()
mach.react()


mach.outbuf += ("add 2") + "\n";
mach.getElementById("par").appendChild(make_atom(2));
mach.react()

mach.react()
mach.react()

mach.outbuf += ("add 3") + "\n";
mach.getElementById("par").appendChild(make_atom3(3));
mach.react()
mach.react()
mach.react()

